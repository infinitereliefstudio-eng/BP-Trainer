/**
 * Minimal promise wrapper around one IndexedDB object store.
 *
 * A write is reported done only when its transaction has committed
 * (`oncomplete`), not when its request succeeded: a transaction can still
 * abort after that. Several writes can share one transaction (`putMany`),
 * so that they all land or none does.
 */
const DB_NAME = 'bp-trainer';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const db = req.result;
      // Closed by the browser (storage cleared, another version): open again next time.
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloquée par un autre onglet.'));
  }).catch((e) => {
    // A failed open is not remembered: the next call tries again.
    dbPromise = null;
    throw e;
  });
  return dbPromise;
}

/** Runs `fn` in one transaction; resolves with its result once the transaction is complete. */
function transact<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | undefined): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let tx: IDBTransaction;
        try {
          tx = db.transaction(STORE, mode);
        } catch (e) {
          dbPromise = null;
          reject(e);
          return;
        }
        let result: T;
        let req: IDBRequest<T> | undefined;
        try {
          req = fn(tx.objectStore(STORE));
        } catch (e) {
          // A value that cannot be stored: nothing of this transaction is kept.
          tx.abort();
          reject(e);
          return;
        }
        if (req) req.onsuccess = () => (result = req.result);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error ?? req?.error ?? new Error('Transaction IndexedDB en erreur.'));
        tx.onabort = () => reject(tx.error ?? new Error('Transaction IndexedDB annulée.'));
      }),
  );
}

export const kv = {
  get: <T>(key: string) => transact<T | undefined>('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
  set: (key: string, value: unknown) => transact('readwrite', (s) => s.put(value, key)).then(() => undefined),
  del: (key: string) => transact('readwrite', (s) => s.delete(key)).then(() => undefined),
  keys: () => transact<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((ks) => ks.map(String)),
  /** Writes every entry in a single transaction: all of them, or none. */
  putMany: (entries: [string, unknown][]) =>
    transact<undefined>('readwrite', (s) => {
      for (const [key, value] of entries) s.put(value, key);
      return undefined;
    }),
};
