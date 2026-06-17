"use client";

import { useEffect, useRef } from "react";

import { useChatStore } from "../store/chat-store";
import { useContextStore } from "../store/context-store";
import { useTraceStore } from "../store/trace-store";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ContextPanel } from "@/components/context/context-panel";
import { isTraceMessage, TraceSidebar } from "@/components/trace/trace-sidebar";

type WorkerFlushMessage = { type: "flush-last-turn" };

function isFlushMessage(value: unknown): value is WorkerFlushMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (value as Partial<WorkerFlushMessage>).type === "flush-last-turn";
}

export default function Home() {
  const workerRef = useRef<Worker | null>(null);
  const addTrace = useTraceStore((state) => state.addTrace);
  const applyChatTraceEvent = useChatStore((state) => state.applyTraceEvent);
  const flushLastTurn = useChatStore((state) => state.flushLastTurn);
  const applyContextTraceEvent = useContextStore(
    (state) => state.applyTraceEvent,
  );

  useEffect(() => {
    const worker = new Worker(
      new URL("../worker/agent-worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    function handleWorkerMessage(event: MessageEvent<unknown>) {
      if (isFlushMessage(event.data)) {
        flushLastTurn();
        return;
      }

      if (!isTraceMessage(event.data)) return;

      const { direction, event: traceEvent } = event.data;
      addTrace(direction, traceEvent);
      applyChatTraceEvent(direction, traceEvent);
      applyContextTraceEvent(direction, traceEvent);

      if (direction === "server->worker" && typeof traceEvent.seq === "number") {
        worker.postMessage({ type: "processed", seq: traceEvent.seq });
      }
    }

    worker.addEventListener("message", handleWorkerMessage);
    workerRef.current = worker;

    return () => {
      worker.removeEventListener("message", handleWorkerMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [addTrace, applyChatTraceEvent, applyContextTraceEvent]);

  function sendMessage(content: string) {
    workerRef.current?.postMessage({ type: "send", content });
  }

  return (
    <main className="grid h-full min-h-0 grid-cols-3 gap-4 p-4">
      <TraceSidebar />
      <ChatPanel onSubmitMessage={sendMessage} />
      <ContextPanel />
    </main>
  );
}
