"use client";

import { Button } from "@agent-console-alchemyst/ui/components/button";
import { Input } from "@agent-console-alchemyst/ui/components/input";
import { type SubmitEvent, useEffect, useRef, useState } from "react";

import { useTraceStore } from "./trace-store";
import { isTraceMessage, TraceSidebar } from "@/components/trace/trace-sidebar";

export default function Home() {
  const workerRef = useRef<Worker | null>(null);
  const addTrace = useTraceStore((state) => state.addTrace);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const worker = new Worker(new URL("./agent-worker.ts", import.meta.url), {
      type: "module",
    });

    function handleWorkerMessage(event: MessageEvent<unknown>) {
      if (!isTraceMessage(event.data)) return;
      addTrace(event.data.direction, event.data.event);
    }

    worker.addEventListener("message", handleWorkerMessage);
    workerRef.current = worker;

    return () => {
      worker.removeEventListener("message", handleWorkerMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [addTrace]);

  function submitMessage(event: SubmitEvent) {
    event.preventDefault();

    const content = message.trim();
    if (!content) return;

    workerRef.current?.postMessage({ type: "send", content });
    setMessage("");
  }

  return (
    <main className="grid h-full min-h-0 grid-cols-3 gap-4 p-4">
      <TraceSidebar />

      <section className="flex min-w-0 flex-col rounded-lg border p-4">
        <form className="mt-auto flex gap-2" onSubmit={submitMessage}>
          <Input
            name="message"
            placeholder="Type a message..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <Button type="submit">Submit</Button>
        </form>
      </section>

      <section className="min-w-0 rounded-lg border p-4"></section>
    </main>
  );
}
