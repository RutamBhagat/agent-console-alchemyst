# Decisions

## Reconnect and `RESUME`

The app intentionally does not rely on `RESUME` for true mid-stream recovery after a socket drop. In this backend, reconnecting aborts the active generation script.
`RESUME` can only replay events already stored in server history; it cannot make the backend continue generating the rest of the answer.
That means a strict protocol-level resume can still leave the user with a partial stream, a missing `TOOL_RESULT`, or no `STREAM_END`.

For that reason, the client treats a mid-stream disconnect as a failed turn and replays the last user message on a fresh socket.
This is the only way to get a complete answer without editing `apps/agent-server`.
It is not pretending to be durable backend recovery; it is a frontend workaround for a backend that cannot resume an aborted script.

Sending `RESUME` after every socket close would add code and misleading logs without fixing the core failure. The backend has already stopped the script, so the client would still need a full turn replay to get a complete response.
`RESUME` is only used for live sequence gaps while the connection still exists.

## Processed Sequence Cursor

The worker owns ordering, deduplication, and the `lastAppliedSeq` cursor. A message is considered applied when the worker has accepted it in order and posted the state patch to the UI.
The stricter interpretation would require a worker -> UI -> worker acknowledgement after React commits the render, but that extra round trip is not useful here.

The heavy protocol work is already outside the main thread. The main thread only updates Zustand stores and renders the relevant panels.
Trace rows are virtualized, context diffs use a virtualized viewer, and selectors limit component updates to the state they actually use.
In practice, acknowledging after the worker posts the patch is the right complexity boundary for this app.

## Pings in the Sequence Stream

`PING` messages are answered immediately when they arrive, before waiting for the sequence gate. Heartbeats are liveness traffic, so delaying `PONG` behind missing application messages would be the wrong behavior.

The sequence gate still advances through `PING` because the backend puts heartbeats in the same global, gapless `seq` stream as application events.
If the client refused to advance through pings, later messages could remain blocked forever.
This is a backend protocol flaw: heartbeats should not share the same application recovery cursor.
Duplicate/replayed pings are tracked so the client does not spam unexpected duplicate `PONG`s.

## Tool Acknowledgements

The client sends `TOOL_ACK` immediately after the tool call has been accepted into UI state.
Waiting for a separate DOM paint acknowledgement would add the same unnecessary worker/UI round trip as the sequence cursor case.

There is also a backend race in chaos mode: when tool calls are buffered by the server's chaos reordering path, the server can start its ACK timeout before the client has actually received the `TOOL_CALL`.
Even immediate ACKs cannot prevent those violations because the client cannot acknowledge a message it has not seen.
Fixing that would require backend changes.

## Tool Call Rendering Model

Chat text is stored by `stream_id`, and tool calls/results are stored by `call_id`.
This keeps updates cheap and direct, and it matches the architecture I would want if the backend supported multiple streams or concurrent tool calls properly.
A tool result can update the matching card without scanning a transcript array.

The tradeoff is that the UI currently renders one growing text block and the tool cards below it, rather than splitting the assistant response into exact chronological text/card/text segments.
I chose this because tool cards are mostly debugging/supporting information and can become blockers while reading the main answer.
The intended UI direction is for tool cards to be collapsed by default.

## Keyed Tool State

Tool calls are stored in a keyed object because `call_id` is the stable identity that matters when results arrive.
The important operation is "update the card for this call id", not "append another item to a list".
This also keeps the shape ready for rapid or concurrent tool calls, even though the current backend does not fully support that behavior.

## Trace Token Grouping

The trace groups token events, but it intentionally reuses the chat stream text instead of stitching a second copy of token text inside the trace store.
This keeps the trace simple and avoids duplicating streaming assembly logic in two places.
The trace is a debugging aid; the chat store remains the source of truth for the rendered stream text.

The tradeoff is that the expanded token row shows the stream text as assembled by the chat state, not a separately preserved per-batch text and duration.

## Trace Linking

Bidirectional trace/chat highlighting was de-scoped.
It would require DOM refs, scroll coordination, highlight state, and edge-case handling across virtualized rows.
That adds ceremony and complexity without improving the core chaos survival path: ordering, dedupe, heartbeats, tool ACKs, context display, and reconnect behavior.

## Context History on Retry

When a reconnect triggers a full turn replay, chat state is rewound to the last user message, but context snapshots are kept.
This is intentional.
The context panel acts as evidence that a rewind/retry happened, rather than pretending the first attempt never existed.
It makes the backend limitation visible during debugging while keeping the chat readable for the user.
