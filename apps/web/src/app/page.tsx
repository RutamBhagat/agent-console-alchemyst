"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

import { useChatStore } from "../store/chat-store";
import { useContextStore } from "../store/context-store";
import {
  isJsonEvent,
  type JsonEvent,
  type TraceDirection,
  useTraceStore,
} from "../store/trace-store";
import {
  type ConnectionStatus,
  ConnectionStatusPill,
  isConnectionStatusMessage,
} from "@/components/connection-status-pill";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ContextPanel } from "@/components/context/context-panel";
import { isTraceMessage, TraceSidebar } from "@/components/trace/trace-sidebar";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@agent-console-alchemyst/ui/components/sidebar";

type WorkerFlushMessage = { type: "flush-last-turn" };
type WorkerProtocolMessage = {
  type: "protocol";
  direction: TraceDirection;
  event: JsonEvent;
};

function isFlushMessage(value: unknown): value is WorkerFlushMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (value as Partial<WorkerFlushMessage>).type === "flush-last-turn";
}

function isProtocolMessage(value: unknown): value is WorkerProtocolMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Partial<WorkerProtocolMessage>;
  return (
    candidate.type === "protocol" &&
    (candidate.direction === "worker->server" ||
      candidate.direction === "server->worker") &&
    isJsonEvent(candidate.event)
  );
}

export default function Home() {
  const workerRef = useRef<Worker | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connected");
  const [sidebarsOpen, setSidebarsOpen] = useState(true);
  const [pendingProcessedSeqs, setPendingProcessedSeqs] = useState<number[]>(
    [],
  );
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
      if (isConnectionStatusMessage(event.data)) {
        setConnectionStatus(event.data.status);
        return;
      }

      if (isFlushMessage(event.data)) {
        flushLastTurn();
        return;
      }

      if (isTraceMessage(event.data)) {
        addTrace(event.data.direction, event.data.event);
        return;
      }

      if (!isProtocolMessage(event.data)) return;

      const { direction, event: protocolEvent } = event.data;
      applyChatTraceEvent(direction, protocolEvent);
      applyContextTraceEvent(direction, protocolEvent);

      const seq = protocolEvent.seq;
      if (direction === "server->worker" && typeof seq === "number") {
        setPendingProcessedSeqs((seqs) =>
          seqs.includes(seq) ? seqs : [...seqs, seq],
        );
      }
    }

    worker.addEventListener("message", handleWorkerMessage);
    workerRef.current = worker;

    return () => {
      worker.removeEventListener("message", handleWorkerMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [addTrace, applyChatTraceEvent, applyContextTraceEvent, flushLastTurn]);

  useEffect(() => {
    if (pendingProcessedSeqs.length === 0) return;

    const worker = workerRef.current;
    if (!worker) return;

    for (const seq of pendingProcessedSeqs) {
      worker.postMessage({ type: "processed", seq });
    }
    setPendingProcessedSeqs([]);
  }, [pendingProcessedSeqs]);

  function sendMessage(content: string) {
    workerRef.current?.postMessage({ type: "send", content });
  }

  return (
    <SidebarProvider
      open={sidebarsOpen}
      onOpenChange={setSidebarsOpen}
      style={{ "--sidebar-width": "30rem" } as CSSProperties}
    >
      <ConnectionStatusPill status={connectionStatus} />
      <SidebarTrigger className="fixed left-3 top-3 z-50 bg-background/90 shadow-sm backdrop-blur" />
      <Sidebar side="left" collapsible="offcanvas">
        <TraceSidebar />
      </Sidebar>
      <SidebarInset className="h-svh min-h-0 p-4">
        <ChatPanel onSubmitMessage={sendMessage} />
      </SidebarInset>
      <Sidebar side="right" collapsible="offcanvas">
        <ContextPanel />
      </Sidebar>
    </SidebarProvider>
  );
}
