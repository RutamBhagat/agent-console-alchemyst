## ISSUE-005 Trace Timeline

- [ ] Build a collapsible trace panel backed by the normalized trace store.
- [ ] Virtualize trace rows with `@tanstack/react-virtual`.
- [ ] Coalesce consecutive token events for the same `stream_id` into expandable token batches.
- [ ] Keep token batch updates throttled or frame-scheduled so 30+ events per second do not rerender the full list.
- [ ] Show `TOOL_CALL` and `TOOL_RESULT` rows with shared `call_id` linkage.
- [ ] Show `PING`, `PONG`, `RESUME`, reconnect, sequence-gap, duplicate-drop, and degraded markers.
- [ ] Provide event type filtering.
- [ ] Provide text search across visible event summaries and expanded payload text.
- [ ] Click timeline rows to scroll/select the related chat or context element.
- [ ] Click chat/tool/context elements to scroll/select the related timeline row.
