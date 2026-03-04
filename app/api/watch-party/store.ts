import { kv } from "@vercel/kv";

const memoryStore = new Map<string, { value: string; expireAt: number }>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function storeGet(key: string): Promise<string | null> {
  const entry = memoryStore.get(key);
  if (entry) {
    if (entry.expireAt > Date.now()) return entry.value;
    memoryStore.delete(key);
  }

  try {
    const data = await withTimeout(kv.get<string>(key), 3000);
    if (data) memoryStore.set(key, { value: typeof data === "string" ? data : JSON.stringify(data), expireAt: Date.now() + 60000 });
    return data;
  } catch {
    return null;
  }
}

export async function storeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  memoryStore.set(key, { value, expireAt: Date.now() + ttlSeconds * 1000 });
  try {
    await withTimeout(kv.set(key, value, { ex: ttlSeconds }), 3000);
  } catch {}
}
