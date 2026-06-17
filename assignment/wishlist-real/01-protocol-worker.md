## ISSUE-001 Protocol Worker Client

- [ ] Create a browser Web Worker that owns the single WebSocket connection to `ws://localhost:4747/ws`.
- [ ] Send `RESUME` before any queued user message after a reconnect opens.
- [ ] Send `USER_MESSAGE` from the worker only when the socket is open.
- [ ] Reset turn-local sequence state when a new user message is accepted because the backend resets `seq` and `eventHistory`.
- [ ] Reply to every `PING` with `PONG { echo: challenge }`, including an empty challenge string.
- [ ] Emit both received `PING` and sent `PONG` into the trace event stream.
- [ ] Send `TOOL_ACK` only after the UI confirms the corresponding tool card is committed.
- [ ] Stop retrying old `TOOL_ACK` messages after reconnect if the call belongs to replayed history and no active server wait can exist.
- [ ] Surface malformed messages as protocol errors without crashing or closing the UI.
- [ ] Keep the worker API deterministic enough to test with fake WebSocket frames.
