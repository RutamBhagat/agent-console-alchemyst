"use client";

export type ConnectionStatus = "connected" | "reconnecting" | "resuming";
export type ConnectionStatusMessage = {
  type: "connection-status";
  status: ConnectionStatus;
};

export function isConnectionStatusMessage(
  value: unknown,
): value is ConnectionStatusMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const status = (value as Partial<ConnectionStatusMessage>).status;
  return (
    (value as Partial<ConnectionStatusMessage>).type === "connection-status" &&
    (status === "connected" ||
      status === "reconnecting" ||
      status === "resuming")
  );
}

export function ConnectionStatusPill({ status }: { status: ConnectionStatus }) {
  const label =
    status === "connected"
      ? "Server connected"
      : status === "reconnecting"
        ? "Server disconnected · reconnecting"
        : "Reconnected · resuming from last event";
  const dotClass =
    status === "connected"
      ? "bg-emerald-500"
      : status === "reconnecting"
        ? "animate-pulse bg-amber-500"
        : "animate-pulse bg-sky-500";

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1 text-xs shadow-sm backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
      {label}
    </div>
  );
}
