/** Which build is running: set by vite.config.ts at build time. */
declare const __APP_VERSION__: string | undefined;
declare const __BUILD_DATE__: string | undefined;

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const BUILD_DATE: string = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : 'en local';
