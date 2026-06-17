import JsonView from "@uiw/react-json-view";
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { VirtualDiffViewer } from "virtual-react-json-diff";

import { useContextStore } from "@/store/context-store";
import type { JsonValue } from "@/store/trace-store";
import { Button } from "@agent-console-alchemyst/ui/components/button";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@agent-console-alchemyst/ui/components/sidebar";

type ContextPanelProps = {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

export function ContextPanel({
  isFullscreen,
  onToggleFullscreen,
}: ContextPanelProps) {
  const contexts = useContextStore((state) => state.contexts);
  const activeContextId = useContextStore((state) => state.activeContextId);
  const setActiveContextId = useContextStore(
    (state) => state.setActiveContextId,
  );
  const contextIds = Object.keys(contexts).sort();
  const snapshots = activeContextId ? (contexts[activeContextId] ?? []) : [];
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, Math.max(snapshots.length - 1, 0));
  const current = snapshots[safeIndex];
  const previous = snapshots[safeIndex - 1];

  useEffect(() => {
    setIndex(Math.max(snapshots.length - 1, 0));
  }, [activeContextId, snapshots.length]);

  function goPrevious() {
    setIndex((value) => Math.max(value - 1, 0));
  }

  function goNext() {
    setIndex((value) => Math.min(value + 1, snapshots.length - 1));
  }

  return (
    <>
      <SidebarHeader className="gap-3 pt-14">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Context</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? <Minimize2 /> : <Maximize2 />}
              <span className="sr-only">
                {isFullscreen ? "Exit context fullscreen" : "Expand context"}
              </span>
            </Button>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {snapshots.length}
          </span>
        </div>
      </SidebarHeader>

      {contextIds.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-2 pb-3">
          {contextIds.map((contextId) => (
            <button
              key={contextId}
              type="button"
              className={
                contextId === activeContextId
                  ? "rounded-full bg-black px-3 py-1 font-mono text-xs text-white"
                  : "rounded-full border px-3 py-1 font-mono text-xs"
              }
              onClick={() => setActiveContextId(contextId)}
            >
              {contextId}
            </button>
          ))}
        </div>
      ) : null}

      {snapshots.length === 0 || !current ? (
        <SidebarContent className="px-4">
          <p className="text-sm text-muted-foreground">
            No context snapshots yet.
          </p>
        </SidebarContent>
      ) : (
        <SidebarContent className="px-2 pb-2">
          {!previous ? (
            <JsonView
              value={asObject(current.data)}
              collapsed={1}
              displayDataTypes={false}
              enableClipboard={false}
              style={{ fontSize: 12 }}
            />
          ) : (
            <VirtualDiffViewer
              oldValue={asObject(previous.data)}
              newValue={asObject(current.data)}
              height={2000}
              hideSearch
              leftTitle={`seq ${previous.seq}`}
              rightTitle={`seq ${current.seq}`}
            />
          )}
        </SidebarContent>
      )}

      {snapshots.length > 1 ? (
        <SidebarFooter className="flex-row items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={safeIndex === 0}
            onClick={goPrevious}
          >
            &lt;
          </button>
          <span className="font-mono">
            {safeIndex + 1}/{snapshots.length}
          </span>
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={safeIndex === snapshots.length - 1}
            onClick={goNext}
          >
            &gt;
          </button>
        </SidebarFooter>
      ) : null}
    </>
  );
}

function asObject(value: JsonValue): object {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return { value };
}
