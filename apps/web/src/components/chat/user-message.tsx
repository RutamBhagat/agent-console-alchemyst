import type { UserMessagePayload } from "../../../../agent-server/src/types";

export function UserMessage({ message }: { message: UserMessagePayload }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-black px-4 py-2 text-sm leading-6 text-white">
        {message.content}
      </p>
    </div>
  );
}
