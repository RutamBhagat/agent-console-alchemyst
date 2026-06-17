"use client";

import JsonView from "@uiw/react-json-view";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useChatStore } from "@/stores/chat-store";
import type { StoredTraceEvent } from "@/stores/trace-store";

interface TraceSidebarProps {
  events: StoredTraceEvent[];
}

export function TraceSidebar({ events }: TraceSidebarProps) {
  const streams = useChatStore((state) => state.streams);
  const parentRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(() => new Set());
  const eventTypes = useMemo(
    () => [...new Set(events.map((event) => event.message.type))].sort(),
    [events],
  );
  const visibleEvents = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      if (hiddenTypes.has(event.message.type)) {
        return false;
      }

      return trimmedQuery
        ? JSON.stringify(event.message).toLowerCase().includes(trimmedQuery)
        : true;
    });
  }, [events, hiddenTypes, query]);
  const rowVirtualizer = useVirtualizer({
    count: visibleEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 136,
    overscan: 6,
  });

  return (
    <aside className="flex h-full min-h-0 flex-col border-r bg-background">
      <div className="border-b py-2 px-3 pr-2">
        <h2 className="text-sm pl-10 font-medium">Trace</h2>
        <p className="text-xs pl-10 text-muted-foreground">
          {visibleEvents.length} / {events.length} events
        </p>
        <input
          aria-label="Search trace events"
          className="mt-2 h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Search events"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto p-2">
        <div
          className="relative w-full"
          style={{ height: rowVirtualizer.getTotalSize() }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const event = visibleEvents[virtualItem.index];

            return (
              <article
                key={virtualItem.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualItem.index}
                className="absolute left-0 top-0 w-full pb-2"
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                <div className="rounded-md border p-2">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">
                      {event.direction === "in"
                        ? "server -> worker"
                        : "worker -> server"}
                    </span>
                    <span className="text-muted-foreground">
                      {event.message.type}
                    </span>
                  </div>
                  <JsonView
                    value={
                      event.direction === "in" && event.message.type === "TOKEN"
                        ? {
                            ...event.message,
                            text: streams[event.message.stream_id]?.text ?? "",
                          }
                        : event.message
                    }
                    collapsed={1}
                    displayDataTypes={false}
                    displayObjectSize={false}
                    enableClipboard={false}
                    shortenTextAfterLength={80}
                    style={
                      {
                        fontSize: 12,
                        "--w-rjv-background-color": "transparent",
                      } as CSSProperties
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 p-2">
        {eventTypes.map((type) => {
          const isVisible = !hiddenTypes.has(type);

          return (
            <button
              key={type}
              className={`rounded-md border px-2 py-1 text-xs ${
                isVisible
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              }`}
              type="button"
              aria-pressed={isVisible}
              onClick={() =>
                setHiddenTypes((current) => {
                  const next = new Set(current);
                  if (next.has(type)) {
                    next.delete(type);
                  } else {
                    next.add(type);
                  }
                  return next;
                })
              }
            >
              {type}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
