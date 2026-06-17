## ISSUE-002 Sequence Gate

- [ ] Implement a sequence gate in the worker that accepts validated server events and emits only contiguous apply-ready events.
- [ ] Track `nextExpectedSeq`, processed seqs, and a small pending map keyed by `seq`.
- [ ] Deduplicate exact repeated `seq` values before they reach domain reducers.
- [ ] Hold out-of-order events until all lower sequence numbers for the current turn have been applied.
- [ ] Advance `lastAppliedSeq` only after the domain reducer accepts the event and the UI store patch is emitted.
- [ ] Use `lastAppliedSeq` as the only value for `RESUME.last_seq`.
- [ ] Do not let a later heartbeat advance the resume cursor past missing lower app events.
- [ ] Add a gap timeout/watchdog only for user-visible degraded status, not for skipping missing sequence numbers.
- [ ] Mark a stream as degraded if a sequence gap prevents progress for a configured interval after reconnect.
- [ ] Unit test reversed events, duplicate events, missing middle event, heartbeat interleaving, and reset-on-new-turn.
