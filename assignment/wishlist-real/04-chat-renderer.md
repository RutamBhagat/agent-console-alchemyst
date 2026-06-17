## ISSUE-004 Streaming Chat Renderer

- [ ] Render tokens incrementally from store updates without waiting for `STREAM_END`.
- [ ] Freeze an in-progress text part when a `TOOL_CALL` is inserted.
- [ ] Render a tool card with stable height strategy so inserting it does not reflow existing text.
- [ ] Send a render-committed signal back to the worker after the tool card first appears.
- [ ] Update the same tool card when `TOOL_RESULT` arrives.
- [ ] Append resumed tokens after the existing frozen text and tool card.
- [ ] Support a tool call before the first token in a stream.
- [ ] Support multiple sequential tool calls in the same stream.
- [ ] Show interrupted/degraded state when the backend replay cannot produce a result or stream end.
- [ ] Allow clicking a stream chunk or tool card to select its trace event.
