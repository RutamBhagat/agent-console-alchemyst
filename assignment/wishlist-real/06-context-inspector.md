## ISSUE-006 Context Inspector

- [ ] Store every `CONTEXT_SNAPSHOT` by `context_id` and sequence.
- [ ] Compute diffs outside the render path, preferably in the worker for large snapshots.
- [ ] Show JSON in a lazy expandable tree using the existing JSON view dependency or a small custom tree.
- [ ] Virtualize or lazily render wide arrays and objects so 500KB snapshots do not freeze the tab.
- [ ] Highlight added, removed, and changed keys for the selected snapshot.
- [ ] Provide a per-context history scrubber.
- [ ] Keep expanded tree node state independent from the raw snapshot data.
- [ ] Show payload size and snapshot seq so large-data behavior is visible during chaos testing.
- [ ] Do not block heartbeat replies while diffing or rendering context data.
