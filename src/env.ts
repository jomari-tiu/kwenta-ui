const raw: string | undefined = import.meta.env.VITE_API_URL;

/**
 * Why this REPORTS rather than throws.
 *
 * A throw here would happen during module evaluation — before React mounts and
 * before any error boundary exists — so the only possible outcome is a blank
 * page with a message buried in the console. The misconfiguration is real and
 * must stop the app, but it should stop it with a screen that says what to fix.
 *
 * Still no silent `?? 'http://localhost:8000'` fallback: that produces a build
 * that looks healthy in production and fails every request with no clue why.
 */
export const ENV_ERROR: string | null = raw ? null : 'VITE_API_URL is not set.';

/**
 * Empty only when ENV_ERROR is set, in which case the app renders the startup
 * error screen and never reaches a request.
 */
export const API_URL = raw ? raw.replace(/\/$/, '') : '';
