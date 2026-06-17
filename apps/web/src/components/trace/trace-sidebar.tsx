import JsonView from "@uiw/react-json-view";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type CSSProperties, useEffect, useMemo, useRef } from "react";
import {
  isJsonEvent,
  type JsonEvent,
  type TraceDirection,
  type TraceEntry,
  useTraceStore,
} from "@/store/trace-store";
import { useUiStore } from "@/store/ui-store";

type WorkerTraceMessage = {
  type: "trace";
  direction: TraceDirection;
  event: JsonEvent;
};

export function TraceSidebar() {
  const traces = useTraceStore((state) => state.traces);
  const groupedTraces = useMemo(() => groupTokenTraces(traces), [traces]);
  const autoScroll = useUiStore((state) => state.autoScroll);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: groupedTraces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 5,
  });

  useEffect(() => {
    if (!autoScroll || groupedTraces.length === 0) return;
    rowVirtualizer.scrollToIndex(groupedTraces.length - 1, { align: "end" });
  }, [autoScroll, rowVirtualizer, groupedTraces.length]);

  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-lg">
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {groupedTraces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trace events yet.</p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const trace = groupedTraces[virtualRow.index];
              if (!trace) return null;

              const style: CSSProperties = {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              };

              return (
                <div
                  key={trace.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="pb-3"
                  style={style}
                >
                  <div className="rounded-md border p-2 text-xs">
                    <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
                      <span>{trace.direction}</span>
                      <span>#{trace.id}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <JsonView
                        value={trace.event}
                        collapsed={1}
                        displayDataTypes={false}
                        enableClipboard={false}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

type TraceDisplayEntry = Omit<TraceEntry, "event"> & { event: JsonEvent };

function groupTokenTraces(traces: TraceEntry[]): TraceDisplayEntry[] {
  const grouped: TraceDisplayEntry[] = [];

  for (const trace of traces) {
    const last = grouped.at(-1);
    if (canGroupTokenTrace(last, trace)) {
      const firstSeq = String(last.event.seq).split("-")[0];
      last.event = {
        type: "TOKEN",
        seq: `${firstSeq}-${trace.event.seq}`,
        text: `${last.event.text}${trace.event.text}`,
        stream_id: trace.event.stream_id,
      };
      continue;
    }

    grouped.push({ ...trace, event: { ...trace.event } });
  }

  return grouped;
}

function canGroupTokenTrace(
  left: TraceDisplayEntry | undefined,
  right: TraceEntry,
): left is TraceDisplayEntry {
  if (!left) return false;

  return (
    left.direction === right.direction &&
    left.direction === "server->worker" &&
    left.event.type === "TOKEN" &&
    right.event.type === "TOKEN" &&
    (typeof left.event.seq === "number" || typeof left.event.seq === "string") &&
    typeof right.event.seq === "number" &&
    typeof left.event.text === "string" &&
    typeof right.event.text === "string" &&
    typeof left.event.stream_id === "string" &&
    left.event.stream_id === right.event.stream_id
  );
}

export function isTraceMessage(value: unknown): value is WorkerTraceMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Partial<WorkerTraceMessage>;
  return (
    candidate.type === "trace" &&
    (candidate.direction === "worker->server" ||
      candidate.direction === "server->worker") &&
    isJsonEvent(candidate.event)
  );
}
