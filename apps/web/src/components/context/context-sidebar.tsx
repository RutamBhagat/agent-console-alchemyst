"use client";

import { useEffect, useState } from "react";
import JsonView from "@uiw/react-json-view";
import { VirtualDiffViewer } from "virtual-react-json-diff";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@agent-console-alchemyst/ui/components/button";
import { useContextStore } from "@/stores/context-store";
import { useUtilStore } from "@/stores/util-store";

export function ContextSidebar() {
  const contexts = useContextStore((state) => state.contexts);
  const { fullscreen, toggleFullscreen } = useUtilStore();
  const [contextId, setContextId] = useState<string>();
  const [snapshotIndex, setSnapshotIndex] = useState(0);
  const contextList = Object.entries(contexts)
    .flatMap(([id, snapshots]) => (snapshots.length ? [{ id, snapshots }] : []))
    .sort(
      (a, b) => (b.snapshots.at(-1)?.seq ?? 0) - (a.snapshots.at(-1)?.seq ?? 0),
    );
  const selected =
    contextList.find((context) => context.id === contextId) ?? contextList[0];
  const snapshots = selected?.snapshots ?? [];
  const current = snapshots[snapshotIndex];
  const previous = snapshots[snapshotIndex - 1];

  useEffect(() => {
    setSnapshotIndex(Math.max(0, snapshots.length - 1));
  }, [selected?.id, snapshots.length]);

  return (
    <aside className="flex h-svh min-h-0 flex-col border-l bg-background">
      <div className="border-b p-3">
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            className="mb-2"
            variant="ghost"
            size="icon-sm"
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
            <span className="sr-only">
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </span>
          </Button>
          {contextList.map((context) => (
            <Button
              key={context.id}
              variant={context.id === selected?.id ? "default" : "outline"}
              size="sm"
              onClick={() => setContextId(context.id)}
            >
              {context.id}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        {current ? (
          <>
            {snapshots.length > 1 ? (
              <div className="mb-3 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={snapshotIndex === 0}
                  onClick={() => setSnapshotIndex(snapshotIndex - 1)}
                >
                  Prev
                </Button>
                <div className="text-xs text-muted-foreground">
                  {snapshotIndex + 1}/{snapshots.length}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={snapshotIndex === snapshots.length - 1}
                  onClick={() => setSnapshotIndex(snapshotIndex + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-auto">
              {!previous ? (
                <JsonView
                  value={current.data}
                  keyName={current.context_id}
                  collapsed={1}
                  displayDataTypes={false}
                />
              ) : (
                <VirtualDiffViewer
                  oldValue={previous.data}
                  newValue={current.data}
                  height={1080}
                  hideSearch
                  showSingleMinimap
                />
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No context snapshots yet.
          </div>
        )}
      </div>
    </aside>
  );
}
