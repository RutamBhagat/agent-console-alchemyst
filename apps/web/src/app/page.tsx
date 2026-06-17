"use client";

import { Button } from "@agent-console-alchemyst/ui/components/button";
import { Input } from "@agent-console-alchemyst/ui/components/input";
import { type FormEvent, useEffect, useRef, useState } from "react";

export default function Home() {
  const workerRef = useRef<Worker | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const worker = new Worker(new URL("./agent-worker.ts", import.meta.url), {
      type: "module",
    });

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = message.trim();
    if (!content) return;

    workerRef.current?.postMessage({ type: "send", content });
    setMessage("");
  }

  return (
    <main className="grid h-full min-h-0 grid-cols-3 gap-4 p-4">
      <section className="min-w-0 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Trace</h2>
      </section>

      <section className="flex min-w-0 flex-col rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Chat</h2>
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

      <section className="min-w-0 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Context</h2>
      </section>
    </main>
  );
}
