const changedFieldLabels = {
  cod_amount: "COD amount",
  policestation_id: "delivery area",
  recipient_address: "delivery address",
  recipient_name: "recipient name",
  recipient_phone: "recipient phone",
  delivery_charge: "delivery charge",
};

export function describeSteadfastEvent(type, body) {
  if (type === "consignment_update") {
    const fields = Array.isArray(body.changed)
      ? [...new Set(body.changed.map((field) => Object.hasOwn(changedFieldLabels, field) ? changedFieldLabels[field] : null).filter(Boolean))]
      : [];
    return fields.length
      ? `Steadfast updated the ${fields.join(", ")}.`
      : "Steadfast updated the parcel details.";
  }
  if (type === "tracking_update" && typeof body.tracking_message === "string") {
    return body.tracking_message.trim().slice(0, 500) || "Steadfast recorded a tracking update.";
  }
  if (type === "delivery_status") {
    const status = String(body.status ?? body.delivery_status ?? "").trim();
    if (/^[a-z_ -]{1,40}$/i.test(status)) {
      return `Steadfast marked the parcel as ${status.replaceAll("_", " ")}.`;
    }
  }
  return "Steadfast sent a parcel update.";
}

const legacyEventTypes = {
  "Consignment changed": "consignment_update",
  "Tracking update": "tracking_update",
  "Delivery status": "delivery_status",
};

export function formatOrderTimelineMessage(entry) {
  if (entry.createdBy !== "courier" || typeof entry.message !== "string") return entry.message;
  const markerStart = entry.message.lastIndexOf(" [STEADFAST:");
  if (markerStart === -1 || !entry.message.endsWith("]")) return entry.message;
  const message = entry.message.slice(0, markerStart).trim();
  if (!message.startsWith("{")) return message;
  try {
    return describeSteadfastEvent(legacyEventTypes[entry.title], JSON.parse(message) || {});
  } catch {
    return "Steadfast sent a parcel update.";
  }
}
