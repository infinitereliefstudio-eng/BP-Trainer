/**
 * The app's single storage policy. Every saved text (projects, progress)
 * goes through here, and nowhere else:
 *
 * - IndexedDB first; localStorage only when IndexedDB refuses a write.
 * - Every write carries a revision that only grows. A read returns the newest
 *   copy of the two stores, so a copy written to localStorage after a failed
 *   IndexedDB write is never hidden by an older IndexedDB value.
 * - Writes of one key run in order, and a read waits for the writes of its
 *   key still under way: a project reopened right after closing it reads what
 *   was just saved, not the state before.
 * - A read that fails is an error, never "nothing saved": the caller must not
 *   take a storage failure for an empty slot and write over it.
 */
import { kv } from './idb';

/** localStorage keeps the revision of `key` under this prefix (IndexedDB keeps it in the record). */
const REV_PREFIX = 'rev:';

interface Revised {
  text: string;
  rev: number;
}

export interface Stored extends Revised {
  /** Where the newest copy was found. */
  from: 'idb' | 'local';
}

/** The storage could not be read: nothing can be said about what it holds. */
export class StorageReadError extends Error {
  constructor() {
    super('Le stockage de l’appli ne répond pas.');
  }
}

const hasIdb = () => typeof indexedDB !== 'undefined';

let lastRev = 0;
function nextRev(): number {
  lastRev = Math.max(Date.now(), lastRev + 1);
  return lastRev;
}

// ------------------------------------------------------------ write queues

const queues = new Map<string, Promise<unknown>>();

function enqueue<T>(key: string, job: () => Promise<T>): Promise<T> {
  return enqueueAll([key], job);
}

/**
 * One job for several keys: it waits for the writes of each, and the reads
 * and writes of each that come after it wait for it.
 */
function enqueueAll<T>(keys: string[], job: () => Promise<T>): Promise<T> {
  const run = Promise.all(keys.map((k) => queues.get(k) ?? Promise.resolve())).then(job);
  const tail = run.then(
    () => undefined,
    () => undefined,
  );
  for (const k of keys) queues.set(k, tail);
  tail.then(() => {
    for (const k of keys) if (queues.get(k) === tail) queues.delete(k);
  });
  return run;
}

/** Resolves once every write already asked for has finished (well or not). */
export async function settled(): Promise<void> {
  while (queues.size) await Promise.all([...queues.values()]);
}

// ------------------------------------------------------------------ reading

function fromIdb(value: unknown): Revised | undefined {
  // Values saved before revisions existed are plain strings: revision 0.
  if (typeof value === 'string') return { text: value, rev: 0 };
  const r = value as Partial<Revised> | null | undefined;
  if (r && typeof r.text === 'string') return { text: r.text, rev: Number(r.rev) || 0 };
  return undefined;
}

function readLocal(key: string): Revised | undefined {
  try {
    const text = localStorage.getItem(key);
    if (text === null) return undefined;
    return { text, rev: Number(localStorage.getItem(REV_PREFIX + key)) || 0 };
  } catch {
    return undefined;
  }
}

async function readIdb(key: string): Promise<Revised | undefined> {
  try {
    return fromIdb(await kv.get(key));
  } catch {
    // One more try: the connection may just have been closed by the system.
    return fromIdb(await kv.get(key));
  }
}

async function readNow(key: string): Promise<Stored | undefined> {
  const local = readLocal(key);
  let idb: Revised | undefined;
  if (hasIdb()) {
    try {
      idb = await readIdb(key);
    } catch {
      if (!local) throw new StorageReadError();
    }
  }
  if (idb && (!local || idb.rev >= local.rev)) return { ...idb, from: 'idb' };
  if (local) return { ...local, from: 'local' };
  return undefined;
}

/**
 * The newest saved text of `key`, or undefined when nothing is saved under it.
 * Throws StorageReadError when the storage cannot be read.
 */
export function readStored(key: string): Promise<Stored | undefined> {
  return (queues.get(key) ?? Promise.resolve()).then(() => readNow(key));
}

// ------------------------------------------------------------------ writing

function setLocal(key: string, text: string, rev: number): void {
  const before = readLocal(key);
  try {
    localStorage.setItem(key, text);
    localStorage.setItem(REV_PREFIX + key, String(rev));
  } catch (e) {
    try {
      if (before) {
        localStorage.setItem(key, before.text);
        localStorage.setItem(REV_PREFIX + key, String(before.rev));
      } else {
        localStorage.removeItem(key);
        localStorage.removeItem(REV_PREFIX + key);
      }
    } catch {
      /* nothing more can be done */
    }
    throw e;
  }
}

/** Once IndexedDB holds the newest copy, a localStorage copy is only in the way. */
function dropLocal(key: string): void {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(REV_PREFIX + key);
  } catch {
    /* no localStorage */
  }
}

/** Saves `text` under `key`. Rejects when neither store accepts it. */
export function writeStored(key: string, text: string): Promise<'idb' | 'local'> {
  return enqueue(key, async () => {
    const rev = nextRev();
    if (hasIdb()) {
      try {
        await kv.set(key, { text, rev });
        dropLocal(key);
        return 'idb';
      } catch {
        /* fall back to localStorage */
      }
    }
    setLocal(key, text, rev);
    return 'local';
  });
}

/**
 * Deletes what is saved under `key`, in both stores (a project the learner
 * chose to delete). Goes through the key's write queue like any write.
 * Rejects when IndexedDB refuses: the entry is then still there.
 */
export function removeStored(key: string): Promise<void> {
  return enqueue(key, async () => {
    if (hasIdb()) await kv.del(key);
    dropLocal(key);
  });
}

/**
 * Saves several entries at once: all of them or none (one IndexedDB
 * transaction; in localStorage, the entries already written are put back
 * if one is refused). It goes through the write queues of its keys like any
 * write: an autosave asked for during a restore is written after it, never
 * under it.
 */
export function writeMany(entries: Record<string, string>): Promise<void> {
  const list = Object.entries(entries);
  // Every write already asked for, on any key, finishes first (as settled()); taken now, so that
  // reads and writes asked for after this call come after it.
  const earlier = [...queues.values()];
  return enqueueAll(
    list.map(([key]) => key),
    async () => {
      await Promise.all(earlier);
      await writeAll(list);
    },
  );
}

async function writeAll(list: [string, string][]): Promise<void> {
  const rev = nextRev();
  if (hasIdb()) {
    try {
      await kv.putMany(list.map(([key, text]) => [key, { text, rev }]));
      for (const [key] of list) dropLocal(key);
      return;
    } catch {
      /* fall back to localStorage */
    }
  }
  const before = list.map(([key]) => [key, readLocal(key)] as const);
  try {
    for (const [key, text] of list) setLocal(key, text, rev);
  } catch (e) {
    for (const [key, old] of before) {
      try {
        if (old) setLocal(key, old.text, old.rev);
        else dropLocal(key);
      } catch {
        /* keep going */
      }
    }
    throw e;
  }
}

/** Every key with a saved text, in either store. */
export async function storedKeys(): Promise<string[]> {
  await settled();
  const keys = new Set<string>();
  if (hasIdb()) {
    try {
      for (const k of await kv.keys()) keys.add(k);
    } catch {
      /* IndexedDB unavailable: localStorage only */
    }
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !k.startsWith(REV_PREFIX)) keys.add(k);
    }
  } catch {
    /* no localStorage */
  }
  return [...keys];
}
