/**
 * Client-side offline layer for Sahby.
 *
 * Two responsibilities:
 *  1. Mirror GET responses from the data APIs into IndexedDB so authenticated
 *     reads still render while offline (network-first, cache-when-failing).
 *  2. Queue non-GET mutations while offline and replay them (FIFO) as soon as
 *     connectivity returns ("sync queue").
 *
 * Installed once by components/PwaBoot.tsx via installOfflineLayer().
 */

export type OfflineStatusEvent = CustomEvent<{
  offline: boolean;
  queued: number;
}>;

const DATA_APIS = ["/api/finance", "/api/bills", "/api/auth", "/api/personal"];
const SKIP_CACHE_QUERY = /(^|[?&])view=backup([&]|$)/;

let db: IDBDatabase | null = null;
let installed = false;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open("sahby-offline", 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("apiCache")) {
        d.createObjectStore("apiCache", { keyPath: "url" });
      }
      if (!d.objectStoreNames.contains("syncQueue")) {
        const s = d.createObjectStore("syncQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("url", "url", { unique: false });
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  name: "apiCache" | "syncQueue",
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const d = await (db ?? openDB());
  return new Promise<T>((resolve, reject) => {
    const tx = d.transaction(name, mode);
    const store = tx.objectStore(name);
    const rq = fn(store);
    rq.onsuccess = () => resolve(rq.result as T);
    rq.onerror = () => reject(rq.error);
  });
}

function broadcast(status: { offline: boolean; queued: number }) {
  const evt = new CustomEvent<{ offline: boolean; queued: number }>(
    "sahby:offline-status",
    { detail: status }
  );
  window.dispatchEvent(evt);
}

export function getQueuedCount(): Promise<number> {
  return Promise.resolve(
    typeof indexedDB === "undefined"
      ? 0
      : withStore<number>(
          "syncQueue",
          "readonly",
          (s) => s.count() as IDBRequest<number>
        ).catch(() => 0)
  );
}

async function cacheGet(url: string) {
  return withStore<{ url: string; body: string; status: number; ts: number } | undefined>(
    "apiCache",
    "readonly",
    (s) => s.get(url) as IDBRequest<any>
  ).catch(() => undefined);
}

async function cachePut(url: string, body: string, status: number) {
  return withStore("apiCache", "readwrite", (s) =>
    s.put({ url, body, status, ts: Date.now() })
  ).catch(() => undefined);
}

async function enqueue(method: string, url: string, body?: string) {
  await withStore("syncQueue", "readwrite", (s) =>
    s.add({ method, url, body, ts: Date.now() })
  );
  const n = await getQueuedCount();
  broadcast({ offline: true, queued: n });
}

/** Replays queued mutations in order. Stops on first failure (kept for retry). */
export async function flushSyncQueue(): Promise<void> {
  const all = await withStore<Array<{ id: number; method: string; url: string; body?: string }>>(
    "syncQueue",
    "readonly",
    (s) => s.getAll() as IDBRequest<any>
  ).catch(() => []);
  if (!all.length) return;

  for (const item of all) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: item.body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await withStore("syncQueue", "readwrite", (s) => s.delete(item.id));
    } catch {
      break;
    }
  }

  const n = await getQueuedCount();
  broadcast({ offline: false, queued: n });
}

function matchesDataApi(url: string): boolean {
  return DATA_APIS.some((p) => url === p || url.startsWith(p + "?") || url.startsWith(p + "/"));
}

/** Patches window.fetch: mirrors data-API GETs and queues offline mutations. */
export function installOfflineLayer(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method || (typeof input !== "string" && input instanceof Request && input.method) || "GET").toUpperCase();
    const full = url.startsWith("/") ? window.location.origin + url : url;
    const path = new URL(full, window.location.origin).pathname;

    if (!matchesDataApi(path) || url.includes("/login") || url.includes("/logout")) {
      return nativeFetch(input, init);
    }

    // Mutations: attempt the network; queue when offline.
    if (method !== "GET") {
      try {
        if (!navigator.onLine) throw new Error("offline");
        return await nativeFetch(input, init);
      } catch {
        await enqueue(method, path, init?.body ? String(init.body) : undefined);
        return Response.json({ queued: true, offline: true }, { status: 201 });
      }
    }

    // Reads: network-first, fall back to the IndexedDB mirror.
    try {
      if (!navigator.onLine) throw new Error("offline");
      const res = await nativeFetch(input, init);
      const body = await res.clone().text();
      if (res.ok && !SKIP_CACHE_QUERY.test(url)) {
        cachePut(path, body, res.status).catch(() => undefined);
      }
      return res;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      const cached = await cacheGet(path);
      if (cached) {
        const q = await getQueuedCount();
        broadcast({ offline: true, queued: q });
        return new Response(cached.body, {
          status: cached.status,
          headers: { "Content-Type": "application/json" },
        });
      }
      broadcast({ offline: true, queued: await getQueuedCount() });
      throw err;
    }
  };
}

// Install at module-evaluation time (runs during hydration, BEFORE any component
// effect) so early data fetches can't race ahead of the fetch patch.
if (typeof window !== "undefined") {
  installOfflineLayer();
}