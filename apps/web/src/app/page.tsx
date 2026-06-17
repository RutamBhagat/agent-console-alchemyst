"use client";

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
import { ToolTurn } from "@/components/tools/tool-turn";
import { useChatStore } from "@/stores/chat-store";
import type { ServerMessage } from "@/worker/types/serverToClient";

type WorkerPatch = { type: "statePatch"; chat?: ServerMessage };

export default function Home() {
  const workerRef = useRef<Worker>(undefined);
  const [message, setMessage] = useState("");
  const { addToken, addToolCall, addToolResult, endStream, chats } =
    useChatStore();

  useEffect(() => {
    const worker = new Worker(
      new URL("../worker/agent-worker.ts", import.meta.url),
    );
    worker.addEventListener("message", (event: MessageEvent<WorkerPatch>) => {
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
    };
  }, []);

  function submitMessage(event: React.SubmitEvent) {
    event.preventDefault();

    const content = message.trim();
    if (!content) return;

    workerRef.current?.postMessage({ type: "sendUserMessage", content });
    setMessage("");
  }

  return (
    <SidebarProvider>
      <SidebarTrigger className="fixed left-3 top-3 z-50 bg-background/90 shadow-sm backdrop-blur" />
      <Sidebar side="left" collapsible="offcanvas"></Sidebar>
      <SidebarInset className="relative h-svh min-h-0 p-4">
        <main className="mx-auto flex h-full w-[min(760px,100%)] flex-col gap-4 overflow-y-auto pb-24 pt-8">
          {chats.map((chat) => (
            <article
              key={chat.stream_id}
              className="rounded-lg border bg-background p-4 shadow-sm"
            >
              <p className="whitespace-pre-wrap text-sm leading-6">
                {chat.text || " "}
              </p>
              <ToolTurn chat={chat} />
            </article>
          ))}
        </main>
        <form
          onSubmit={submitMessage}
          className="absolute bottom-6 left-1/2 flex w-[min(640px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2"
        >
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
      <Sidebar side="right" collapsible="offcanvas"></Sidebar>
    </SidebarProvider>
  );
}
