"use client";

import JsonView from "@uiw/react-json-view";
import type { CSSProperties } from "react";
import { useChatStore } from "@/stores/chat-store";
import type { StoredTraceEvent } from "@/stores/trace-store";

interface TraceSidebarProps {
  events: StoredTraceEvent[];
}

export function TraceSidebar({ events }: TraceSidebarProps) {
  const streams = useChatStore((state) => state.streams);

  return (
    <aside className="flex h-full min-h-0 flex-col border-r bg-background">
      <div className="border-b pl-12 py-2">
        <h2 className="text-sm font-medium">Trace</h2>
        <p className="text-xs text-muted-foreground">{events.length} events</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {events.map((event, index) => (
          <article key={index} className="mb-2 rounded-md border p-2">
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
          </article>
        ))}
      </div>
    </aside>
  );
}
