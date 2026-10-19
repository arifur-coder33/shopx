const CAMPAIGN_TIME_ZONE = "Asia/Dhaka";

/** Format a stored campaign instant for a datetime-local input in Bangladesh time. */
export function formatCampaignDateTimeLocal(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPAIGN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

/** Parse a datetime-local value as Bangladesh wall-clock time, independent of server TZ. */
export function parseCampaignDateTimeLocal(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value));
  if (!match) throw new Error("Enter a valid campaign date.");
  const [, year, month, day, hour, minute, second = "0"] = match;
  // Bangladesh uses UTC+06:00 and has no daylight-saving transition.
  const timestamp = Date.UTC(+year, +month - 1, +day, +hour - 6, +minute, +second);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== +year || date.getUTCMonth() !== +month - 1 || date.getUTCDate() !== +day || +hour > 23 || +minute > 59 || +second > 59) {
    throw new Error("Enter a valid campaign date.");
  }
  return date;
}
