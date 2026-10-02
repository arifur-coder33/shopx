import prisma from "@/lib/prisma";

const POLL_INTERVAL_MS = 5000;
const MAX_ABANDONED_LEADS = 500;
const globalForFeeds = globalThis;
if (!globalForFeeds.__shopzyPostgresFeeds) globalForFeeds.__shopzyPostgresFeeds = new Map();

function toIso(value) {
  return value?.toISOString?.() || value || null;
}

function emit(feed, change) {
  for (const listener of feed.listeners) {
    Promise.resolve(listener(change)).catch(() => {});
  }
}

async function pollOrders(feed) {
  const since = new Date(feed.cursor.getTime() - POLL_INTERVAL_MS);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, createdAt: true },
  });
  for (const order of orders) {
    if (!feed.seen.has(order.id)) {
      feed.seen.add(order.id);
      emit(feed, { operationType: "insert", documentKey: { _id: order.id } });
    }
    if (order.createdAt > feed.cursor) feed.cursor = order.createdAt;
  }
  while (feed.seen.size > 1000) feed.seen.delete(feed.seen.values().next().value);
}

async function pollAbandoned(feed) {
  const leads = await prisma.abandonedCheckoutLead.findMany({
    orderBy: { updatedAt: "desc" },
    take: MAX_ABANDONED_LEADS + 1,
  });
  const current = new Map(leads.map((lead) => [lead.id, lead]));
  if (feed.snapshot) {
    for (const lead of leads) {
      const previous = feed.snapshot.get(lead.id);
      if (!previous || previous.updatedAt.getTime() !== lead.updatedAt.getTime()) {
        emit(feed, {
          operationType: previous ? "update" : "insert",
          documentKey: { _id: lead.id },
          fullDocument: {
            ...lead,
            createdAt: toIso(lead.createdAt),
            updatedAt: toIso(lead.updatedAt),
            lastSeenAt: toIso(lead.lastSeenAt),
          },
        });
      }
    }
    if (leads.length <= MAX_ABANDONED_LEADS) {
      for (const id of feed.snapshot.keys()) {
        if (!current.has(id)) emit(feed, { operationType: "delete", documentKey: { _id: id } });
      }
    }
  }
  feed.snapshot = current;
}

async function poll(feed) {
  if (feed.polling || !feed.listeners.size) return;
  feed.polling = true;
  try {
    if (feed.collectionName === "Order") await pollOrders(feed);
    else if (feed.collectionName === "AbandonedCheckoutLead") await pollAbandoned(feed);
  } catch (error) {
    console.warn(`PostgreSQL realtime polling failed for ${feed.collectionName}:`, error?.message || error);
  } finally {
    feed.polling = false;
  }
}

export async function subscribeToPostgresChanges(collectionName, _pipeline, listener) {
  let feed = globalForFeeds.__shopzyPostgresFeeds.get(collectionName);
  if (!feed) {
    feed = {
      collectionName,
      listeners: new Set(),
      seen: new Set(),
      snapshot: null,
      cursor: new Date(Date.now() - POLL_INTERVAL_MS),
      polling: false,
      timer: null,
    };
    globalForFeeds.__shopzyPostgresFeeds.set(collectionName, feed);
  }
  feed.listeners.add(listener);
  if (!feed.timer) {
    poll(feed);
    feed.timer = setInterval(() => poll(feed), POLL_INTERVAL_MS);
    feed.timer.unref?.();
  }
  return () => {
    feed.listeners.delete(listener);
    if (!feed.listeners.size) {
      clearInterval(feed.timer);
      feed.timer = null;
      globalForFeeds.__shopzyPostgresFeeds.delete(collectionName);
    }
  };
}
