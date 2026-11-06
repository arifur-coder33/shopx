// Cache display output until the next real schedule transition, rather than
// polling unchanged storefront content every minute. End times are inclusive.
export function storefrontScheduleWindow(records, now = Date.now()) {
  const boundaries = records.flatMap((record) => [
    record.startAt ? new Date(record.startAt).getTime() : NaN,
    record.endAt ? new Date(record.endAt).getTime() + 1 : NaN,
  ]).filter(Number.isFinite);
  const previous = boundaries.filter((time) => time <= now);
  const upcoming = boundaries.filter((time) => time > now);
  return {
    epoch: String(previous.length ? Math.max(...previous) : 0),
    // The extra second avoids expiring just before a millisecond boundary.
    revalidate: upcoming.length ? Math.max(1, Math.ceil((Math.min(...upcoming) - now) / 1000) + 1) : false,
  };
}
