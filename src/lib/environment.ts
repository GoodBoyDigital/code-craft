/**
 * Environment detection utilities
 */

/** Whether we're running inside the Tauri desktop app (vs browser dev mode) */
export const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

/** Whether we're in development mode */
export const isDev = import.meta.env.DEV;

/** Whether we're in production mode */
export const isProd = import.meta.env.PROD;
