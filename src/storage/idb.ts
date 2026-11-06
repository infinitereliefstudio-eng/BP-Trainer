/** Minimal promise wrapper around one IndexedDB object store. */
const DB_NAME = 'bp-trainer';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const kv = {
  get: <T>(key: string) => run<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
  set: (key: string, value: unknown) => run('readwrite', (s) => s.put(value, key)),
  del: (key: string) => run('readwrite', (s) => s.delete(key)),
};
