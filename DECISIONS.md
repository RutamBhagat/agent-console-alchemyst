- The client queues new prompts instead of sending them mid-stream because the provided single-session backend aborts the active stream and clears history on every new `USER_MESSAGE`; true concurrent streams require backend support for multiple active `stream_id`s.

- Chose regenerate over resume because the mock server only replays already-generated history on reconnect and cannot continue an aborted stream, so retrying the deterministic last user turn is the only way to recover missing future tokens/results.
