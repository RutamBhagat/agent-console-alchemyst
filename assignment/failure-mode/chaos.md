# Chaos Mode Protocol Failure Modes

These are cases where chaos mode asks the client to tolerate network/protocol disruption, but the server cannot actually provide the recovery semantics the protocol shape implies.

## 1. Forced mid-stream disconnects cannot be resumed

Chaos mode enables connection drops after a random message count (`src/chaos.ts:5-10`, `src/chaos.ts:150-170`). The send path records each message in `eventHistory`, then asks the chaos engine whether to drop the connection (`src/server.ts:433-448`).

When a drop happens, the socket is terminated and the script stops on the next `readyState` check (`src/server.ts:336-339`). A reconnect creates a new chaos engine and calls `abortStream()` before accepting the new socket (`src/server.ts:141-149`). `RESUME` only replays stored messages; it does not continue the script (`src/server.ts:252-269`).

Failure mode: if chaos terminates the connection halfway through a stream, it is impossible for the client to resume the stream to completion. The client can only recover a prefix. The remaining script events will never be generated, and no reliable `STREAM_END` follows.


## 2. The drop-triggering message can be stored as delivered even when it was never sent

`sendMessage()` pushes the message into `eventHistory` before chaos decides to terminate the socket (`src/server.ts:439-447`). Because `shouldDropConnection()` runs before `process(message)`, the message that crosses the drop threshold is never passed to `rawSend()` (`src/chaos.ts:50-53`, `src/server.ts:442-448`).

Failure mode: resume history can contain a message that the server never delivered. If the client's `last_seq` was advanced by a later out-of-order message or heartbeat, that undelivered message may be skipped forever. Even when replayed, it is replayed as history, not as proof that the original stream continued.


## 3. Reordering breaks single-cursor resume

Chaos reordering buffers messages and later flushes them in shuffled order (`src/chaos.ts:84-112`). The resume protocol is only `RESUME { last_seq }`, and replay filters with `m.seq > last_seq` (`src/server.ts:252-262`).

Failure mode: a client that receives `seq=12` before `seq=9` has no safe single number to send on reconnect. If it sends `last_seq=12`, missing lower messages are lost. If it sends `last_seq=8`, already-applied messages replay. The protocol has no ack set, gap list, or per-stream cursor that can describe out-of-order receipt.


## 4. Buffered reordered messages can be invisible until stream end

When reorder hits, `process()` may return no messages and keep the message only in `reorderBuffer` (`src/chaos.ts:84-99`). Those buffered messages are flushed only when a later non-buffered send occurs or at stream end (`src/chaos.ts:100-112`, `src/chaos.ts:126-139`, `src/server.ts:406-414`).

Failure mode: if chaos drops the connection while messages are sitting in the reorder buffer, those messages were generated and placed in `eventHistory` but were never visible to the client on the original connection. The server can replay them later, but it still cannot continue the stream past the drop, so replay may produce a partial answer with no terminal event.


## 5. Reconnect replaces the chaos scenario instead of continuing it

Every chaos-mode connection gets a new random chaos config and a new `ChaosEngine` (`src/server.ts:146-154`). That means a reconnect after a chaos drop does not continue the same failure scenario; it starts a different one with a different drop threshold, reorder chance, duplicate chance, latency chance, and corrupt-ping chance.

Failure mode: the client cannot reason about one disrupted stream lifecycle. A single logical stream may be affected by multiple unrelated chaos configurations, while the server still has only one global `seq`/history model.


## 6. Heartbeat corruption can terminate a valid stream without a resumable terminal state

Chaos can emit an empty ping challenge (`src/server.ts:510-517`). Pings are stored in the same history as stream data (`src/server.ts:519-529`), and missed pongs can terminate the socket (`src/server.ts:485-506`).

Failure mode: a transport heartbeat failure can kill an active stream, but the only recovery mechanism is the same replay-only `RESUME`. The client may recover historical pings and stream fragments, but the server does not preserve the running script or send a terminal stream state.

