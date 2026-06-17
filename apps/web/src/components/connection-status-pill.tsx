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

export function ConnectionStatusPill({
  status,
}: {
  status: ConnectionStatus;
}) {
  const label =
    status === "connected"
      ? "Connected"
      : status === "reconnecting"
        ? "Reconnecting…"
        : "Regenerating…";

  return (
    <div className="fixed right-6 top-6 z-50 rounded-full border bg-background/95 px-3 py-1 text-xs shadow-sm backdrop-blur">
      {label}
    </div>
  );
}
