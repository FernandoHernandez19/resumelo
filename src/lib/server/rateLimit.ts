export const RATE_LIMIT_MAX = 20;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export interface RateLimiter {
  /** Registra una petición y devuelve true si está permitida. */
  check: (key: string) => boolean;
}

interface Options {
  max?: number;
  windowMs?: number;
  now?: () => number;
}

/**
 * Ventana deslizante en memoria. Es una protección de mejor esfuerzo: en
 * serverless cada instancia tiene su propio Map, así que el límite no es global.
 */
export function createRateLimiter({
  max = RATE_LIMIT_MAX,
  windowMs = RATE_LIMIT_WINDOW_MS,
  now = Date.now,
}: Options = {}): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastSweep = now();

  function sweep(current: number) {
    if (current - lastSweep < windowMs) return;
    lastSweep = current;
    for (const [key, times] of hits) {
      if (times.every((t) => current - t >= windowMs)) hits.delete(key);
    }
  }

  return {
    check(key) {
      const current = now();
      sweep(current);
      const recent = (hits.get(key) ?? []).filter((t) => current - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(current);
      hits.set(key, recent);
      return true;
    },
  };
}

/** Primer valor de x-forwarded-for; "desconocida" si no viene. Nunca se registra. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "desconocida";
}

export const chatRateLimiter = createRateLimiter();
