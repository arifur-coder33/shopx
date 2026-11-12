export async function fireCAPI(payload) {
  if (typeof window === "undefined") return;

  const response = await fetch("/api/social-event/capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  if (!response.ok) throw new Error("Tracking request failed: " + response.status);
  const receipt = await response.json();
  if (!receipt.success) throw new Error("Tracking request was not accepted");
  for (const [provider, status] of Object.entries(receipt.providers || {})) {
    if (status === "failed") console.warn("Tracking provider failed:", provider, payload.eventId);
  }
  return receipt;
}
