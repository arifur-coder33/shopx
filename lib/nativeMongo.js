import { MongoClient } from "mongodb";

const globalForNativeMongo = globalThis;

export async function getNativeMongoDatabase() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not configured.");
  if (!globalForNativeMongo.__shopzyNativeMongoClient) {
    globalForNativeMongo.__shopzyNativeMongoClient = new MongoClient(uri, { maxPoolSize: 5 });
  }
  const client = globalForNativeMongo.__shopzyNativeMongoClient;
  await client.connect();
  const databaseName = decodeURIComponent(new URL(uri).pathname.replace(/^\//, ""));
  if (!databaseName) throw new Error("DATABASE_URL must include a database name.");
  return client.db(databaseName);
}
