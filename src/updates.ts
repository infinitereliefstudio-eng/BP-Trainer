/**
 * Tells when a newer version of the app has been published while this one
 * is open (the installed app can stay in the background for days).
 *
 * The build writes `version.json` next to index.html; the service worker
 * never caches it. It is read at start, each time the app comes back to the
 * front, and every half hour. Nothing happens offline or in a preview.
 */
import { APP_VERSION } from './version';

const EVERY_MS = 30 * 60 * 1000;

async function publishedVersion(): Promise<string | undefined> {
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === 'string' ? data.version : undefined;
  } catch {
    return undefined;
  }
}

/** Calls `onNewer` once, with the published version, when it differs from the running one. Returns a stop function. */
export function watchForUpdates(onNewer: (version: string) => void): () => void {
  if (APP_VERSION === 'dev' || typeof window === 'undefined' || !/^https?:$/.test(location.protocol)) return () => undefined;
  let done = false;
  const check = async () => {
    if (done || document.visibilityState === 'hidden') return;
    const v = await publishedVersion();
    if (v && v !== APP_VERSION && !done) {
      done = true;
      onNewer(v);
    }
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };
  const first = setTimeout(check, 5000);
  const timer = setInterval(check, EVERY_MS);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
