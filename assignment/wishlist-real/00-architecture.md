## ISSUE-000 Architecture Boundary

- [ ] Keep WebSocket IO, JSON validation, heartbeat replies, reconnect timers, sequence buffering, and protocol side effects outside React components.
- [ ] Run protocol client logic in a dedicated Web Worker so token bursts, large context payloads, and reconnect work do not block UI rendering.
- [ ] Expose a typed worker message API with `connect`, `disconnect`, `sendUserMessage`, `clientEvent`, `statePatch`, and `protocolViolation` messages.
- [ ] Use Zod only at the raw WebSocket boundary to validate server messages before converting them to domain events.
- [ ] Use a small Zustand store as the UI projection store, fed by worker state patches.
- [ ] Keep React components mostly presentational: chat transcript, trace timeline, context inspector, connection badge, and command input.
- [ ] Do not store raw unbounded server payloads directly in React component state.
- [ ] Keep derived UI structures keyed by stable ids: `stream_id`, `call_id`, `context_id`, and `seq`.
- [ ] Document backend impossibilities in the UI/decisions: replay cannot continue an aborted server script, and tool ACK state is not durable across reconnect.
