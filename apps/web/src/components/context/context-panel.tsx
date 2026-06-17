import JsonView from "@uiw/react-json-view";
import { useEffect, useState } from "react";
import { VirtualDiffViewer } from "virtual-react-json-diff";

import { useContextStore } from "@/store/context-store";
import type { JsonValue } from "@/store/trace-store";

export function ContextPanel() {
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
    <section className="flex min-h-0 min-w-0 flex-col rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Context</h2>
        {snapshots.length > 0 ? (
          <span className="font-mono text-xs text-muted-foreground">
            {safeIndex + 1}/{snapshots.length}
          </span>
        ) : null}
      </div>

      {contextIds.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
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
        <p className="text-sm text-muted-foreground">
          No context snapshots yet.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {safeIndex === 0 || !previous ? (
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
        </div>
      )}

      {snapshots.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
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
        </div>
      ) : null}
    </section>
  );
}

function asObject(value: JsonValue): object {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return { value };
}
