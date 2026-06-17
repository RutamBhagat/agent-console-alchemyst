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
import { useUtilStore } from "@/stores/util-store";
import type {
  ContextSnapshotMessage,
  ServerMessage,
} from "@/worker/types/serverToClient";

type WorkerPatch = {
  type: "statePatch";
  chat?: ServerMessage;
  context?: ContextSnapshotMessage;
};

type WorkerEvent = WorkerPatch | TraceEvent;

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
    chats,
  } = useChatStore();
  const addContextSnapshot = useContextStore((state) => state.addContextSnapshot);
  const { events: traceEvents, addTraceEvent, clearTraceEvents } = useTraceStore();
  const { fullscreen, mode, toggleMode } = useUtilStore();

  useEffect(() => {
    const worker = new Worker(
      new URL("../worker/agent-worker.ts", import.meta.url),
    );
    worker.addEventListener("message", (event: MessageEvent<WorkerEvent>) => {
      if (event.data.type === "clientEvent") {
        addTraceEvent(event.data);
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
    <SidebarProvider style={{ "--sidebar-width": fullscreen ? "100rem" : "40rem" } as CSSProperties}>
      <SidebarTrigger className="fixed left-3 top-3 z-50 bg-background/90 shadow-sm backdrop-blur" />
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
