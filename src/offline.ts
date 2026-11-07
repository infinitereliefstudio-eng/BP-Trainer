/**
 * Offline support: registers the service worker when the app is served as
 * itself (GitHub Pages, the installed APK). Skipped inside a frame (the
 * claude.ai test page) and on file:// or http:// previews.
 */
export function registerOffline(): void {
  const framed = (() => {
    try {
      return window.top !== window;
    } catch {
      return true;
    }
  })();
  const secure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (framed || !secure || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => undefined);
  });
}
