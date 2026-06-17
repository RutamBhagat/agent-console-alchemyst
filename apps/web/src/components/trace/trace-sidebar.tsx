import JsonView from "@uiw/react-json-view";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type ComponentProps,
  forwardRef,
  memo,
  type CSSProperties,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isJsonEvent,
  type JsonEvent,
  type TraceEntry,
  type TraceDirection,
  useTraceStore,
} from "@/store/trace-store";
import { useUiStore } from "@/store/ui-store";
import { Input } from "@agent-console-alchemyst/ui/components/input";
import {
  SidebarContent,
  SidebarHeader,
} from "@agent-console-alchemyst/ui/components/sidebar";

type WorkerTraceMessage = {
  type: "trace";
  direction: TraceDirection;
  event: JsonEvent;
};

export function TraceSidebar() {
  const traces = useTraceStore((state) => state.traces);
  const autoScroll = useUiStore((state) => state.autoScroll);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const visibleTraces = useMemo(
    () =>
      deferredSearch
        ? traces.filter((trace) => traceMatchesSearch(trace, deferredSearch))
        : traces,
    [deferredSearch, traces],
  );
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: visibleTraces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 5,
  });

  useEffect(() => {
    if (!autoScroll || visibleTraces.length === 0) return;
    const frame = requestAnimationFrame(() => {
      rowVirtualizer.scrollToIndex(visibleTraces.length - 1, { align: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [autoScroll, rowVirtualizer, visibleTraces.length]);

  return (
    <>
      <SidebarHeader className="gap-3 pt-14">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Protocol</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {visibleTraces.length}/{traces.length}
          </span>
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search events"
          className="h-8"
        />
      </SidebarHeader>
      <SidebarContent ref={parentRef} className="px-2 pb-2">
        {visibleTraces.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">
            {traces.length === 0 ? "No trace events yet." : "No matching events."}
          </p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const trace = visibleTraces[virtualRow.index];
              if (!trace) return null;

              const style: CSSProperties = {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              };

              return (
                <TraceRow
                  key={trace.id}
                  ref={rowVirtualizer.measureElement}
                  trace={trace}
                  data-index={virtualRow.index}
                  style={style}
                />
              );
            })}
          </div>
        )}
      </SidebarContent>
    </>
  );
}

const TraceRow = memo(
  forwardRef<HTMLDivElement, { trace: TraceEntry; style: CSSProperties } & ComponentProps<"div">>(
    function TraceRow({ trace, style, ...props }, ref) {
      const callId = getCallId(trace.event);
      const linkClass = callId ? callIdClass(callId) : "border-border";

      return (
        <div ref={ref} className="pb-3" style={style} {...props}>
          <div className={`rounded-md border border-l-4 p-2 text-xs ${linkClass}`}>
            <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
              <span>{trace.direction}</span>
              <span>#{trace.id}</span>
            </div>
            {callId ? (
              <div className="mb-2 inline-flex max-w-full rounded bg-muted px-2 py-1 font-mono text-[11px]">
                <span className="truncate">call_id {callId}</span>
              </div>
            ) : null}
            <TraceBody event={trace.event} />
          </div>
        </div>
      );
    },
  ),
);

type TokenTraceEvent = JsonEvent & {
  type: "TOKEN";
  stream_id: string;
  text: string;
  token_count: number;
  seq_range: string;
};

function TraceBody({ event }: { event: JsonEvent }) {
  if (isTokenTraceEvent(event)) return <TokenTraceBody event={event} />;

  return (
    <div className="overflow-x-auto">
      <JsonView
        value={event}
        collapsed={1}
        displayDataTypes={false}
        enableClipboard={false}
        style={{ fontSize: 12 }}
      />
    </div>
  );
}

function TokenTraceBody({ event }: { event: TokenTraceEvent }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[11px] text-muted-foreground">
        TOKEN stream {event.stream_id} · seq {event.seq_range} · {event.token_count} chunks
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px]">{event.text}</pre>
    </div>
  );
}
function isTokenTraceEvent(event: JsonEvent): event is TokenTraceEvent {
  return (
    event.type === "TOKEN" &&
    typeof event.stream_id === "string" &&
    typeof event.text === "string" &&
    typeof event.token_count === "number" &&
    typeof event.seq_range === "string"
  );
}

function traceMatchesSearch(trace: TraceEntry, query: string) {
  return `${trace.direction} ${trace.id} ${JSON.stringify(trace.event) ?? ""}`
    .toLowerCase()
    .includes(query);
}

function getCallId(event: JsonEvent) {
  if (
    (event.type === "TOOL_CALL" ||
      event.type === "TOOL_ACK" ||
      event.type === "TOOL_RESULT") &&
    typeof event.call_id === "string"
  ) {
    return event.call_id;
  }
  return null;
}

function callIdClass(callId: string) {
  const classes = [
    "border-l-sky-500 bg-sky-500/5",
    "border-l-emerald-500 bg-emerald-500/5",
    "border-l-amber-500 bg-amber-500/5",
    "border-l-fuchsia-500 bg-fuchsia-500/5",
    "border-l-rose-500 bg-rose-500/5",
  ];
  let hash = 0;
  for (const char of callId) hash = (hash + char.charCodeAt(0)) % classes.length;
  return classes[hash];
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
