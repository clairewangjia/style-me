// Tiny IndexedDB wrapper for two libraries: uploads + generations.
// All blobs persist locally — survives refresh. No server needed.

const DB_NAME = "styleme";
const DB_VERSION = 1;

export type LibraryStore = "uploads" | "generations";

export interface LibraryRecord {
  id: string;            // crypto.randomUUID
  blob: Blob;            // image bytes
  mime: string;          // e.g. "image/png"
  createdAt: number;     // epoch ms
  mode?: string;         // only for generations: "hair" | "color" | ...
  sourceId?: string;     // only for generations: id of upload it came from
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("uploads")) {
        db.createObjectStore("uploads", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("generations")) {
        const s = db.createObjectStore("generations", { keyPath: "id" });
        s.createIndex("by_mode", "mode");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: LibraryStore,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const result = fn(s);
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        } else {
          result.then(resolve, reject);
        }
        t.oncomplete = () => db.close();
        t.onerror = () => reject(t.error);
      }),
  );
}

export async function addRecord(
  store: LibraryStore,
  rec: Omit<LibraryRecord, "id" | "createdAt"> &
    Partial<Pick<LibraryRecord, "id" | "createdAt">>,
): Promise<LibraryRecord> {
  const full: LibraryRecord = {
    id: rec.id ?? crypto.randomUUID(),
    createdAt: rec.createdAt ?? Date.now(),
    blob: rec.blob,
    mime: rec.mime,
    mode: rec.mode,
    sourceId: rec.sourceId,
  };
  await tx(store, "readwrite", (s) => s.add(full));
  return full;
}

export function listRecords(store: LibraryStore): Promise<LibraryRecord[]> {
  return tx(store, "readonly", (s) => s.getAll() as IDBRequest<LibraryRecord[]>)
    .then((rows) => rows.sort((a, b) => b.createdAt - a.createdAt));
}

export function deleteRecord(store: LibraryStore, id: string): Promise<void> {
  return tx(store, "readwrite", (s) => s.delete(id) as IDBRequest<undefined>)
    .then(() => undefined);
}

export function clearStore(store: LibraryStore): Promise<void> {
  return tx(store, "readwrite", (s) => s.clear() as IDBRequest<undefined>)
    .then(() => undefined);
}

// Helpers ────────────────────────────────────────────────────────────

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
