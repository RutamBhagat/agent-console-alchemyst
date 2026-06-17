import { Button } from "@agent-console-alchemyst/ui/components/button";
import { Input } from "@agent-console-alchemyst/ui/components/input";
import { type SubmitEvent, useEffect, useRef, useState } from "react";

import { getAgentText, useChatStore } from "@/app/chat-store";

type ChatPanelProps = {
  onSubmitMessage: (content: string) => void;
};

export function ChatPanel({ onSubmitMessage }: ChatPanelProps) {
  const messages = useChatStore((state) => state.messages);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function submitMessage(event: SubmitEvent) {
    event.preventDefault();

    const content = message.trim();
    if (!content) return;

    onSubmitMessage(content);
    setMessage("");
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-lg border p-4">
      <div className="min-h-0 flex-1 space-y-3 overflow-auto pb-4">
        {messages.map((chatMessage) =>
          chatMessage.role === "user" ? (
            <pre
              key={chatMessage.id}
              className="ml-auto w-fit whitespace-pre-wrap rounded-lg bg-black p-3 text-sm text-white"
            >
              {chatMessage.event.content}
            </pre>
          ) : (
            <div
              key={chatMessage.id}
              className="max-w-full rounded-lg border p-3 text-sm"
            >
              <p className="whitespace-pre-wrap">{getAgentText(chatMessage)}</p>
              {chatMessage.status === "streaming" ? (
                <span className="mt-2 block text-xs text-muted-foreground">
                  streaming…
                </span>
              ) : null}
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <form className="flex gap-2" onSubmit={submitMessage}>
        <Input
          name="message"
          placeholder="Type a message..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button type="submit">Submit</Button>
      </form>
    </section>
  );
}
