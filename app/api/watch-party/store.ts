import { kv } from "@vercel/kv";

const memoryStore = new Map<string, { value: string; expireAt: number }>();

async function tryKV<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

export async function storeGet(key: string): Promise<string | null> {
  const result = await tryKV(() => kv.get<string>(key));
  if (result.ok) return result.data;

  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expireAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function storeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const result = await tryKV(() => kv.set(key, value, { ex: ttlSeconds }));
  if (!result.ok) {
    memoryStore.set(key, { value, expireAt: Date.now() + ttlSeconds * 1000 });
  }
}
