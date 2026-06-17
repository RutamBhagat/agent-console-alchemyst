import JsonView from "@uiw/react-json-view";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type CSSProperties, useEffect, useRef } from "react";
import {
  isJsonEvent,
  type JsonEvent,
  type TraceDirection,
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
  const autoScroll = useUiStore((state) => state.autoScroll);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: traces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 5,
  });

  useEffect(() => {
    if (!autoScroll || traces.length === 0) return;
    rowVirtualizer.scrollToIndex(traces.length - 1, { align: "end" });
  }, [autoScroll, rowVirtualizer, traces.length]);

  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-lg">
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {traces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trace events yet.</p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const trace = traces[virtualRow.index];
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
