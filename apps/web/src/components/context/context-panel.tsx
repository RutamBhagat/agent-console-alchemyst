import JsonView from "@uiw/react-json-view";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { VirtualDiffViewer } from "virtual-react-json-diff";

import { useContextStore } from "@/store/context-store";
import type { JsonValue } from "@/store/trace-store";
import { Input } from "@agent-console-alchemyst/ui/components/input";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@agent-console-alchemyst/ui/components/sidebar";

export function ContextPanel() {
  const contexts = useContextStore((state) => state.contexts);
  const activeContextId = useContextStore((state) => state.activeContextId);
  const setActiveContextId = useContextStore(
    (state) => state.setActiveContextId,
  );
  const contextIds = Object.keys(contexts).sort();
  const snapshots = activeContextId ? (contexts[activeContextId] ?? []) : [];
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const visibleSnapshots = useMemo(
    () =>
      deferredSearch
        ? snapshots.filter((snapshot) =>
            JSON.stringify(snapshot.data).toLowerCase().includes(deferredSearch),
          )
        : snapshots,
    [deferredSearch, snapshots],
  );
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, Math.max(visibleSnapshots.length - 1, 0));
  const current = visibleSnapshots[safeIndex];
  const sourceIndex = current ? snapshots.findIndex((item) => item === current) : -1;
  const previous = sourceIndex > 0 ? snapshots[sourceIndex - 1] : undefined;

  useEffect(() => {
    setIndex(Math.max(visibleSnapshots.length - 1, 0));
  }, [activeContextId, visibleSnapshots.length]);

  function goPrevious() {
    setIndex((value) => Math.max(value - 1, 0));
  }

  function goNext() {
    setIndex((value) => Math.min(value + 1, visibleSnapshots.length - 1));
  }

  return (
    <>
      <SidebarHeader className="gap-3 pt-14">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Context</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {visibleSnapshots.length}/{snapshots.length}
          </span>
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search context"
          className="h-8"
        />
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

      {visibleSnapshots.length === 0 || !current ? (
        <SidebarContent className="px-4">
          <p className="text-sm text-muted-foreground">
            {snapshots.length === 0
              ? "No context snapshots yet."
              : "No matching snapshots."}
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

      {visibleSnapshots.length > 1 ? (
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
            {safeIndex + 1}/{visibleSnapshots.length}
          </span>
          <button
            type="button"
            className="rounded border px-2 py-1 disabled:opacity-40"
            disabled={safeIndex === visibleSnapshots.length - 1}
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
