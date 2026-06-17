import { Button } from "@agent-console-alchemyst/ui/components/button";
import { Input } from "@agent-console-alchemyst/ui/components/input";
import JsonView from "@uiw/react-json-view";
import { type SubmitEvent, useEffect, useRef, useState } from "react";

import { useChatStore } from "@/store/chat-store";
import type { JsonValue } from "@/store/trace-store";
import { useUiStore } from "@/store/ui-store";

type ChatPanelProps = {
  onSubmitMessage: (content: string) => void;
};

export function ChatPanel({ onSubmitMessage }: ChatPanelProps) {
  const messages = useChatStore((state) => state.messages);
  const autoScroll = useUiStore((state) => state.autoScroll);
  const toggleAutoScroll = useUiStore((state) => state.toggleAutoScroll);
  const isStreaming = messages.some(
    (chatMessage) =>
      chatMessage.role === "agent" && chatMessage.status === "streaming",
  );
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!autoScroll) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [autoScroll, messages]);

  function submitMessage(event: SubmitEvent) {
    event.preventDefault();

    const content = message.trim();
    if (!content || isStreaming) return;

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
              className="max-w-full space-y-3 rounded-lg border p-3 text-sm"
            >
              {chatMessage.parts.map((part, index) =>
                part.kind === "text" ? (
                  <p key={`text-${index}`} className="whitespace-pre-wrap">
                    {getTextPartText(part.tokens)}
                  </p>
                ) : (
                  <div key={part.callId} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono">{part.toolName}</span>
                      <span className="text-muted-foreground">
                        {part.status}
                      </span>
                    </div>
                    <div className="space-y-2 overflow-x-auto">
                      <JsonBlock label="args" value={part.args} />
                      {part.status === "done" && part.result !== undefined ? (
                        <JsonBlock label="result" value={part.result} />
                      ) : null}
                    </div>
                  </div>
                ),
              )}
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
        <Button
          type="button"
          onClick={toggleAutoScroll}
          aria-pressed={autoScroll}
        >
          {autoScroll ? "Auto" : "Manual"}
        </Button>
        <Input
          name="message"
          placeholder="Type a message..."
          value={message}
          disabled={isStreaming}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button type="submit" disabled={isStreaming}>
          {isStreaming ? (
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </section>
  );
}

function getTextPartText(tokens: { seq: number; text: string }[]) {
  return [...tokens]
    .sort((left, right) => left.seq - right.seq)
    .map((token) => token.text)
    .join("");
}

function JsonBlock({ label, value }: { label: string; value: JsonValue }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] text-muted-foreground">
        {label}
      </div>
      <JsonView
        value={asObject(value)}
        collapsed={1}
        displayDataTypes={false}
        enableClipboard={false}
        style={{ fontSize: 12 }}
      />
    </div>
  );
}

function asObject(value: JsonValue): object {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return { value };
}
