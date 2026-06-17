## ISSUE-007 Reconnect And Degraded Recovery

- [ ] Detect unexpected socket close and show reconnecting state within 500ms.
- [ ] Reconnect with backoff delays of 500ms, 1s, 2s, 4s, then cap at 10s.
- [ ] Keep chat, trace, and context panels readable while reconnecting.
- [ ] On reconnect open, enter `resuming` and send `RESUME { last_seq: lastAppliedSeq }` first.
- [ ] Replay events through the same sequence gate and reducers as live events.
- [ ] Preserve pending tool cards during reconnect.
- [ ] Mark pending tool cards degraded if replay cannot produce their result after the backend has aborted the script.
- [ ] Mark streams degraded if no `STREAM_END` can arrive after a chaos or reconnect interruption.
- [ ] Explain degraded states in terse UI copy without claiming the client recovered impossible backend state.
- [ ] Add a reconnect watchdog only to update UI status; do not use it to fabricate missing protocol events.
