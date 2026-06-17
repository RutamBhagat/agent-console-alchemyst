"use client";

import { useEffect, useRef } from "react";

import { useChatStore } from "./chat-store";
import { useContextStore } from "./context-store";
import { useTraceStore } from "./trace-store";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ContextPanel } from "@/components/context/context-panel";
import { isTraceMessage, TraceSidebar } from "@/components/trace/trace-sidebar";

export default function Home() {
  const workerRef = useRef<Worker | null>(null);
  const addTrace = useTraceStore((state) => state.addTrace);
  const applyChatTraceEvent = useChatStore((state) => state.applyTraceEvent);
  const applyContextTraceEvent = useContextStore((state) => state.applyTraceEvent);

  useEffect(() => {
    const worker = new Worker(new URL("./agent-worker.ts", import.meta.url), {
      type: "module",
    });

    function handleWorkerMessage(event: MessageEvent<unknown>) {
      if (!isTraceMessage(event.data)) return;
      addTrace(event.data.direction, event.data.event);
      applyChatTraceEvent(event.data.direction, event.data.event);
      applyContextTraceEvent(event.data.direction, event.data.event);
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
