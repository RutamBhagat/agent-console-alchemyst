# Normal Mode Protocol Failure Modes

These are cases where the protocol shape implies the server can support a behavior, but the normal-mode implementation cannot actually do it.

## 1. `RESUME` cannot resume an interrupted stream

The protocol exposes `RESUME { last_seq }`, and the server keeps `eventHistory`, so the expected behavior is that a reconnecting client can recover after a connection loss.

That only works for messages already sent. On every new WebSocket connection, the server calls `abortStream()` before assigning `activeWs` (`src/server.ts:141-143`). `handleResume()` only replays `eventHistory` entries with `seq > last_seq` (`src/server.ts:252-262`) and explicitly does not restart the script (`src/server.ts:264-269`).

Failure mode: if a connection drops mid-answer, the client can replay the prefix but the rest of the answer is lost forever. No later `TOKEN`, `TOOL_RESULT`, or `STREAM_END` will be produced for that stream.


## 2. Tool calls are not recoverable across reconnect

`TOOL_CALL`, `TOOL_ACK`, and `TOOL_RESULT` imply a durable call lifecycle: the server asks for a tool action, the client acknowledges it, and the server later sends the result.

In practice, pending tool calls live only in `pendingAcks`. A replacement connection calls `abortStream()`, which clears all pending ACKs and resolves their waiters (`src/server.ts:597-609`). Replaying history can resend the old `TOOL_CALL`, but the server is no longer waiting for that `call_id`; a client `TOOL_ACK` for it is logged as unexpected (`src/server.ts:310-319`). The original script was already aborted, so no `TOOL_RESULT` will follow.

Failure mode: reconnect during a tool call leaves the client with a replayed `TOOL_CALL` that cannot complete. The protocol has a call id, but the server does not maintain call state across the exact reconnect path that `RESUME` is meant to support.


## 3. Heartbeats consume the same ordered sequence as stream data

Every server message has a `seq`, including `PING` (`src/types/serverToClient.ts:34-38`). The heartbeat stores pings in the same `eventHistory` used by `RESUME` (`src/server.ts:519-529`).

That means the recovery cursor mixes transport liveness with application output. A client that tracks `last_seq` globally can advance its resume position by receiving a `PING`, even if nearby stream messages are still being processed. On reconnect, `RESUME` filters only by `seq > last_seq` (`src/server.ts:257`), so any lower-sequence application messages the client did not finish applying are no longer replayed.

Failure mode: the protocol asks one cursor to represent both liveness and stream progress. That makes resume correctness depend on client-side timing details instead of on durable application delivery.


## 4. A new user message destroys the previous conversation's resumable history

`USER_MESSAGE` starts a new turn, but the server resets `seq` and clears all `eventHistory` immediately (`src/server.ts:223-230`).

The protocol has no conversation id or turn id, so `RESUME { last_seq }` cannot identify which stream the client wants to resume. After any new user message, old stream history is gone and sequence numbers start again from `1`.

Failure mode: resume is only valid for the latest turn and only until the next `USER_MESSAGE`. If a client reconnects with a cursor from an earlier turn, the server can replay unrelated messages with reused sequence numbers.


## 5. `ERROR` exists in the protocol but normal execution cannot send terminal failures

The server-to-client type includes `ERROR` (`src/types/serverToClient.ts:46-50`), but normal script execution does not emit it when it abandons work. Parse errors are only logged server-side (`src/server.ts:182-192`). ACK timeouts are also only logged, then the script continues as if the tool was acknowledged (`src/server.ts:556-568`).

Failure mode: clients cannot reliably distinguish successful completion, silent abandonment, and degraded execution from the protocol stream alone. For example, a missing `TOOL_ACK` still leads to a later `TOOL_RESULT`, which makes the ACK requirement mostly decorative.

