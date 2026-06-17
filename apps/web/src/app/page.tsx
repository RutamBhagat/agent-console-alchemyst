"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { env } from "@agent-console-alchemyst/env/web";
import { Button } from "@agent-console-alchemyst/ui/components/button";
import { Input } from "@agent-console-alchemyst/ui/components/input";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@agent-console-alchemyst/ui/components/sidebar";
import { UserMessage } from "@/components/chat/user-message";
import { ContextSidebar } from "@/components/context/context-sidebar";
import { ToolTurn } from "@/components/tools/tool-turn";
import { TraceSidebar } from "@/components/trace/trace-sidebar";
import { useChatStore } from "@/stores/chat-store";
import { useContextStore } from "@/stores/context-store";
import { useTraceStore, type TraceEvent } from "@/stores/trace-store";
import { useUtilStore, type ConnectionStatus } from "@/stores/util-store";
import type {
  ContextSnapshotMessage,
  ServerMessage,
} from "../../../agent-server/src/types";

type WorkerPatch = {
  type: "statePatch";
  chat?: ServerMessage;
  context?: ContextSnapshotMessage;
};

type RetryUserMessage = {
  type: "retryUserMessage";
  content: string;
};

type WorkerEvent =
  | WorkerPatch
  | TraceEvent
  | RetryUserMessage
  | {
      type: "connectionStatus";
      status: ConnectionStatus;
      reconnectDelayMs?: number;
    };

export default function Home() {
  const workerRef = useRef<Worker>(undefined);
  const mainRef = useRef<HTMLElement>(null);
  const [message, setMessage] = useState("");
  const {
    addUserMessage,
    addToken,
    addToolCall,
    addToolResult,
    endStream,
    retryUserMessage,
    chats,
  } = useChatStore();
  const addContextSnapshot = useContextStore(
    (state) => state.addContextSnapshot,
  );
  const {
    events: traceEvents,
    addTraceEvent,
    clearTraceEvents,
  } = useTraceStore();
  const {
    connectionStatus,
    reconnectDelayMs,
    fullscreen,
    mode,
    setConnectionStatus,
    toggleMode,
  } = useUtilStore();

  useEffect(() => {
    const worker = new Worker(
      new URL("../worker/agent-worker.ts", import.meta.url),
    );
    worker.addEventListener("message", (event: MessageEvent<WorkerEvent>) => {
      if (event.data.type === "clientEvent") {
        addTraceEvent(event.data);
        return;
      }
      if (event.data.type === "retryUserMessage") {
        retryUserMessage({ type: "USER_MESSAGE", content: event.data.content });
        return;
      }
      if (event.data.type === "connectionStatus") {
        setConnectionStatus(event.data.status, event.data.reconnectDelayMs);
        return;
      }

      if (event.data.context) addContextSnapshot(event.data.context);

      const chat = event.data.chat;
      if (!chat) return;

      if (chat.type === "TOKEN") addToken(chat);
      if (chat.type === "TOOL_CALL") {
        addToolCall(chat);
        worker.postMessage({ type: "toolAck", call_id: chat.call_id });
      }
      if (chat.type === "TOOL_RESULT") addToolResult(chat);
      if (chat.type === "STREAM_END") endStream(chat);
    });
    worker.postMessage({ type: "connect", url: env.NEXT_PUBLIC_AGENT_WS_URL });
    workerRef.current = worker;

    return () => {
      worker.postMessage({ type: "disconnect" });
      worker.terminate();
      workerRef.current = undefined;
      clearTraceEvents();
    };
  }, [
    addContextSnapshot,
    addToken,
    addToolCall,
    addToolResult,
    addTraceEvent,
    clearTraceEvents,
    endStream,
    retryUserMessage,
    setConnectionStatus,
  ]);

  useEffect(() => {
    if (mode !== "auto") return;
    mainRef.current?.scrollTo({
      top: mainRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chats, mode]);

  function submitMessage(event: React.SubmitEvent) {
    event.preventDefault();

    const content = message.trim();
    if (!content) return;

    addUserMessage({ type: "USER_MESSAGE", content });
    workerRef.current?.postMessage({ type: "sendUserMessage", content });
    setMessage("");
  }

  return (
    <SidebarProvider
      style={
        { "--sidebar-width": fullscreen ? "100rem" : "30rem" } as CSSProperties
      }
    >
      <SidebarTrigger className="fixed left-3 top-3 z-50 bg-background/90 shadow-sm backdrop-blur" />
      <div
        className={`fixed right-3 top-3 z-50 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur ${
          connectionStatus === "connected"
            ? "border-green-600/40 bg-green-50/90 text-green-700"
            : connectionStatus === "connecting"
              ? "border-red-600/40 bg-red-50/90 text-red-700"
              : "border-amber-600/40 bg-amber-50/90 text-amber-700"
        }`}
      >
        {connectionStatus === "connected"
          ? "Connected"
          : connectionStatus === "connecting"
            ? "Connecting..."
            : reconnectDelayMs
              ? `Reconnecting in ${Math.ceil(reconnectDelayMs / 1000)}s...`
              : "Reconnecting..."}
      </div>
      <Sidebar side="left" collapsible="offcanvas">
        <TraceSidebar events={traceEvents} />
      </Sidebar>
      <SidebarInset className="relative h-svh min-h-0 p-4">
        <main
          ref={mainRef}
          className="mx-auto flex h-full w-[min(760px,100%)] flex-col gap-4 overflow-y-auto pb-24 pt-8"
        >
          {chats.map((chat, index) =>
            "type" in chat ? (
              <UserMessage key={`user-${index}`} message={chat} />
            ) : (
              <article
                key={chat.stream_id}
                className="rounded-lg border bg-background p-4 shadow-sm"
              >
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {chat.text || " "}
                </p>
                <ToolTurn chat={chat} />
              </article>
            ),
          )}
        </main>
        <form
          onSubmit={submitMessage}
          className="absolute bottom-6 left-1/2 flex w-[min(640px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2"
        >
          <Button
            type="button"
            onClick={toggleMode}
            className="h-10 px-4"
            aria-pressed={mode === "auto"}
          >
            {mode === "auto" ? "Auto" : "Manual"}
          </Button>
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message"
            className="h-10 bg-background"
          />
          <Button type="submit" className="h-10 px-4">
            Submit
          </Button>
        </form>
      </SidebarInset>
      <Sidebar side="right" collapsible="offcanvas">
        <ContextSidebar />
      </Sidebar>
    </SidebarProvider>
  );
}
