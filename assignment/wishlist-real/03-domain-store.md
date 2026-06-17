## ISSUE-003 Domain Store

- [ ] Use Zustand for the UI projection store.
- [ ] Store normalized streams by `stream_id`, tool calls by `call_id`, contexts by `context_id`, and trace rows by local id.
- [ ] Represent chat stream content as ordered parts: token chunk, tool call placeholder, tool result, error, end marker.
- [ ] Keep token text append-only for a stream part once rendered.
- [ ] Keep pending tool calls visible across reconnect attempts.
- [ ] Represent connection lifecycle as explicit states: `idle`, `connecting`, `connected`, `reconnecting`, `resuming`, `degraded`, `disconnected`.
- [ ] Store protocol warnings separately from fatal UI errors.
- [ ] Store large context payload metadata separately from expanded tree UI state.
- [ ] Avoid speculative abstractions; reducers can be plain functions until behavior repeats.
