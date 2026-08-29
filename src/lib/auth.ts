import Cookies from 'js-cookie';

export const TOKEN_COOKIE = 'accessToken';

/**
 * Pure client-side token storage. The API is on a different origin, so the
 * token travels as an `Authorization: Bearer` header set by the axios
 * interceptor in lib/api.ts — never as a cookie. A cookie is used only because
 * it gives us an expiry for free.
 *
 * Because no cookie is sent cross-origin, there is NO CSRF surface here. Don't
 * add csurf.
 */
export function getToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

export function setToken(token: string): void {
  Cookies.set(TOKEN_COOKIE, token, {
    // 30 days, not 7: a personal app that logs you out weekly on your phone is
    // a personal app you stop using.
    expires: 30,
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
  });
}

export function clearToken(): void {
  Cookies.remove(TOKEN_COOKIE, { path: '/' });
}
