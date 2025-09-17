// Simple KV async con IndexedDB y fallback a localStorage.
// Sin dependencias externas.

export interface AsyncKV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

class LocalStorageKV implements AsyncKV {
  async get(key: string): Promise<string | null> {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  async set(key: string, value: string): Promise<void> {
    try { localStorage.setItem(key, value); } catch { /* noop */ }
  }
  async remove(key: string): Promise<void> {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }
}

class IndexedDbKV implements AsyncKV {
  private dbPromise: Promise<IDBDatabase>;
  constructor(
    private dbName = 'reading-progress-db',
    private storeName = 'progress'
  ) {
    this.dbPromise = new Promise((resolve, reject) => {
      let openReq: IDBOpenDBRequest;
      try {
        openReq = indexedDB.open(dbName, 1);
      } catch (e) {
        reject(e);
        return;
      }
      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'key' });
        }
      };
      openReq.onsuccess = () => resolve(openReq.result);
      openReq.onerror = () => reject(openReq.error);
      openReq.onblocked = () => {
        // Si queda bloqueada por otra pestaña, igual resolvemos cuando onsuccess dispare.
      };
    });
  }

  private async withStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    return db.transaction(this.storeName, mode).objectStore(this.storeName);
  }

  async get(key: string): Promise<string | null> {
    try {
      const store = await this.withStore('readonly');
      return await new Promise<string | null>((resolve, reject) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? String(req.result.value) : null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const store = await this.withStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async remove(key: string): Promise<void> {
    const store = await this.withStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export async function makeBestKV(): Promise<AsyncKV> {
  // Detección y fallback seguro (iOS Private Mode puede tirar InvalidStateError)
  try {
    if (typeof indexedDB !== 'undefined') {
      const kv = new IndexedDbKV();
      // Smoke test rápido para confirmar que abre y escribe
      const testKey = '__kv_smoke__';
      await kv.set(testKey, '1');
      await kv.remove(testKey);
      return kv;
    }
  } catch {
    // ignorar y caer a localStorage
  }
  return new LocalStorageKV();
}
