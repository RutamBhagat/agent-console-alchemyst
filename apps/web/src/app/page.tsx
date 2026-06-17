"use client";

import { Button } from "@agent-console-alchemyst/ui/components/button";
import { Input } from "@agent-console-alchemyst/ui/components/input";

export default function Home() {
  return (
    <main className="grid h-full min-h-0 grid-cols-3 gap-4 p-4">
      <section className="min-w-0 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Trace</h2>
      </section>

      <section className="flex min-w-0 flex-col rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Chat</h2>
        <form className="mt-auto flex gap-2">
          <Input name="message" placeholder="Type a message..." />
          <Button type="submit">Submit</Button>
        </form>
      </section>

      <section className="min-w-0 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Context</h2>
      </section>
    </main>
  );
}
