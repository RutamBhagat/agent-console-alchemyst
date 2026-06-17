## ISSUE-008 Verification Plan

- [ ] Add focused tests for the sequence gate.
- [ ] Add focused tests for token batch coalescing.
- [ ] Add focused tests for context diff output.
- [ ] Add focused tests for reconnect state transitions using fake worker events.
- [ ] Add a throwaway Bun script if no test harness exists for directly calling protocol reducers.
- [ ] Use normal-mode prompts: `hello`, `report`, `analyze`, `lookup`, `schema`, and `long`.
- [ ] Use chaos mode to verify duplicate drops, reordered buffering, reconnect status, corrupt heartbeat handling, and large context responsiveness.
- [ ] Check `GET /log` for `PONG`, `TOOL_ACK`, and `RESUME` behavior after manual runs.
- [ ] Record known backend protocol failures as expected degraded behavior, not frontend bugs.
