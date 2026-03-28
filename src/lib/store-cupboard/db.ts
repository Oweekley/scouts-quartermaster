"use client";

export type StoreCupboardEquipment = {
  id: string;
  name: string;
  assetId: string;
  qrValue: string;
  quantity: number;
  status: string;
  condition: string;
  locationLabel: string | null;
  isConsumable: boolean;
  updatedAtMs: number;
};

export type StoreCupboardSnapshot = {
  generatedAtMs: number;
  equipment: StoreCupboardEquipment[];
};

export type OfflineQueueItem =
  | {
      id: string;
      createdAtMs: number;
      type: "consume_one";
      payload: { equipmentId: string; baseUpdatedAtMs?: number };
    };

const DB_NAME = "sq_offline";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("snapshot")) db.createObjectStore("snapshot");
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open IndexedDB."));
  });
}

async function withStore<T>(storeName: "snapshot" | "queue", mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed."));
    });
  } finally {
    db.close();
  }
}

export async function getSnapshot(): Promise<StoreCupboardSnapshot | null> {
  const res = await withStore<unknown>("snapshot", "readonly", (s) => s.get("snapshot"));
  if (!res || typeof res !== "object") return null;
  return res as StoreCupboardSnapshot;
}

export async function setSnapshot(snapshot: StoreCupboardSnapshot): Promise<void> {
  await withStore("snapshot", "readwrite", (s) => s.put(snapshot, "snapshot"));
}

export async function clearSnapshot(): Promise<void> {
  await withStore("snapshot", "readwrite", (s) => s.delete("snapshot"));
}

export async function listQueue(): Promise<OfflineQueueItem[]> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("queue", "readonly");
      const store = tx.objectStore("queue");
      const items: OfflineQueueItem[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (!cursor) return resolve(items.sort((a, b) => a.createdAtMs - b.createdAtMs));
        items.push(cursor.value as OfflineQueueItem);
        cursor.continue();
      };
      req.onerror = () => reject(req.error ?? new Error("Could not read offline queue."));
    });
  } finally {
    db.close();
  }
}

export async function enqueue(item: OfflineQueueItem): Promise<void> {
  await withStore("queue", "readwrite", (s) => s.put(item));
}

export async function removeFromQueue(id: string): Promise<void> {
  await withStore("queue", "readwrite", (s) => s.delete(id));
}
