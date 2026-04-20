/**
 * Session utilities — parses our (mock) JWT-like tokens and helps the auth
 * system reason about expiry. A real backend would hand out actual JWTs;
 * this helper works for both since it's tolerant of non-JWT strings.
 */

interface TokenPayload {
  exp?: number; // ms since epoch OR seconds since epoch (both accepted)
  sub?: string;
  kind?: 'access' | 'refresh';
}

export function decodeToken(token: string | null | undefined): TokenPayload | null {
  if (!token) return null;
  try {
    // mock tokens: "mock.access.<base64>" / "mock.refresh.<base64>"
    if (token.startsWith('mock.')) {
      const raw = token.split('.').slice(-1)[0];
      return JSON.parse(atob(raw)) as TokenPayload;
    }
    // real JWT: three base64url parts separated by "."
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    ) as TokenPayload;
    return payload;
  } catch {
    return null;
  }
}

export function getExpiryMs(token: string | null | undefined): number | null {
  const payload = decodeToken(token);
  if (!payload?.exp) return null;
  // Heuristic: seconds-since-epoch JWTs are ~1.7e9; ms-since-epoch are ~1.7e12
  return payload.exp < 1e12 ? payload.exp * 1000 : payload.exp;
}

export function isExpired(token: string | null | undefined, skewMs = 0): boolean {
  const exp = getExpiryMs(token);
  if (exp == null) return false;
  return Date.now() + skewMs >= exp;
}

export function msUntilExpiry(token: string | null | undefined): number {
  const exp = getExpiryMs(token);
  if (exp == null) return Infinity;
  return Math.max(0, exp - Date.now());
}

/* Idle-timeout helper — logs the user out after N minutes of no activity. */
export function createIdleWatcher(
  minutes: number,
  onIdle: () => void
): { stop: () => void } {
  let timer: number | null = null;
  const limit = minutes * 60_000;

  const reset = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(onIdle, limit);
  };
  const events: (keyof DocumentEventMap)[] = [
    'mousedown',
    'keydown',
    'mousemove',
    'wheel',
    'touchstart',
  ];
  events.forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
  reset();

  return {
    stop() {
      if (timer !== null) window.clearTimeout(timer);
      events.forEach((ev) => document.removeEventListener(ev, reset));
    },
  };
}
