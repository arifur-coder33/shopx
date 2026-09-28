import { getNativeMongoDatabase } from "../nativeMongo.js";

const globalForChangeFeed = globalThis;
if (!globalForChangeFeed.__shopzyMongoChangeFeeds) globalForChangeFeed.__shopzyMongoChangeFeeds = new Map();

async function ensureStream(feed) {
  if (feed.stream || feed.starting) return feed.starting;
  feed.starting = (async () => {
    const db = await getNativeMongoDatabase();
    const stream = db.collection(feed.collectionName).watch(feed.pipeline, { fullDocument: "updateLookup" });
    feed.stream = stream;
    stream.on("change", (change) => {
      for (const listener of feed.listeners) Promise.resolve(listener(change)).catch(() => {});
    });
    stream.on("error", () => {
      if (feed.stream !== stream) return;
      feed.stream = null;
      feed.starting = null;
      stream.close().catch(() => {});
      if (feed.listeners.size) {
        const retry = setTimeout(() => ensureStream(feed).catch(() => {}), 3000);
        retry.unref?.();
      }
    });
  })().finally(() => { feed.starting = null; });
  return feed.starting;
}

export async function subscribeToMongoChanges(collectionName, pipeline, listener) {
  const normalizedPipeline = pipeline || [];
  const key = `${collectionName}:${JSON.stringify(normalizedPipeline)}`;
  let feed = globalForChangeFeed.__shopzyMongoChangeFeeds.get(key);
  if (!feed) {
    feed = { collectionName, pipeline: normalizedPipeline, listeners: new Set(), stream: null, starting: null };
    globalForChangeFeed.__shopzyMongoChangeFeeds.set(key, feed);
  }
  feed.listeners.add(listener);
  try {
    await ensureStream(feed);
  } catch (error) {
    feed.listeners.delete(listener);
    if (!feed.listeners.size) globalForChangeFeed.__shopzyMongoChangeFeeds.delete(key);
    throw error;
  }
  return () => {
    feed.listeners.delete(listener);
    if (!feed.listeners.size) {
      globalForChangeFeed.__shopzyMongoChangeFeeds.delete(key);
      const stream = feed.stream;
      feed.stream = null;
      if (stream) stream.close().catch(() => {});
    }
  };
}
