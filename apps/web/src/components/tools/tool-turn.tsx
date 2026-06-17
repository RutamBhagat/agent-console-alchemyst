"use client";

import JsonView from "@uiw/react-json-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@agent-console-alchemyst/ui/components/accordion";
import type { ChatStream } from "@/stores/chat-store";

export function ToolTurn({ chat }: { chat: ChatStream }) {
  const calls = Object.values(chat.toolCalls);

  if (calls.length === 0) return null;

  return (
    <Accordion
      key={calls.map((call) => call.call_id).join("|")}
      type="multiple"
      defaultValue={calls.map((call) => call.call_id)}
      className="mt-4 gap-3"
    >
      {calls.map((call) => (
        <AccordionItem
          key={call.call_id}
          value={call.call_id}
          className="rounded-lg border bg-muted/35 px-3"
        >
          <AccordionTrigger className="px-0 hover:no-underline">
            <span className="flex flex-col gap-1">
              <span>{call.tool_name}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="rounded-md border bg-background p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Args
              </div>
              <JsonView
                value={call.args}
                keyName="args"
                collapsed={false}
                displayDataTypes={false}
              />
            </div>
            {chat.toolResults[call.call_id] ? (
              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Result
                </div>
                <JsonView
                  value={chat.toolResults[call.call_id].result}
                  keyName="result"
                  collapsed={false}
                  displayDataTypes={false}
                />
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
