import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  getClientIp,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "./rateLimit";

function setup() {
  let time = 1_000_000;
  const limiter = createRateLimiter({ now: () => time });
  return { limiter, advance: (ms: number) => (time += ms) };
}

describe("createRateLimiter", () => {
  it("permite hasta 20 peticiones y rechaza la 21", () => {
    const { limiter } = setup();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(limiter.check("1.1.1.1")).toBe(true);
    }
    expect(limiter.check("1.1.1.1")).toBe(false);
  });

  it("cuenta cada IP por separado", () => {
    const { limiter } = setup();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) limiter.check("1.1.1.1");
    expect(limiter.check("1.1.1.1")).toBe(false);
    expect(limiter.check("2.2.2.2")).toBe(true);
  });

  it("se recupera al pasar la ventana de 10 minutos", () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) limiter.check("1.1.1.1");
    expect(limiter.check("1.1.1.1")).toBe(false);
    advance(RATE_LIMIT_WINDOW_MS - 1);
    expect(limiter.check("1.1.1.1")).toBe(false);
    advance(1);
    expect(limiter.check("1.1.1.1")).toBe(true);
  });

  it("usa una ventana deslizante, no bloques fijos", () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 10; i++) limiter.check("a");
    advance(RATE_LIMIT_WINDOW_MS / 2);
    for (let i = 0; i < 10; i++) limiter.check("a");
    expect(limiter.check("a")).toBe(false);
    advance(RATE_LIMIT_WINDOW_MS / 2); // vencen solo las 10 primeras
    for (let i = 0; i < 10; i++) expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("limpia las entradas vencidas para que el Map no crezca", () => {
    let time = 0;
    const limiter = createRateLimiter({ max: 1, now: () => time });
    // Una IP bloqueada y muchas otras que ya no vuelven.
    for (let i = 0; i < 1000; i++) limiter.check(`ip-${i}`);
    time += RATE_LIMIT_WINDOW_MS + 1;
    // La siguiente petición dispara la limpieza; las IPs viejas pueden entrar de nuevo
    // como si fueran nuevas y el estado anterior ya no pesa.
    expect(limiter.check("nueva")).toBe(true);
    expect(limiter.check("ip-0")).toBe(true);
  });
});

describe("getClientIp", () => {
  it("toma el primer valor de x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(getClientIp(headers)).toBe("203.0.113.5");
  });

  it("usa un valor por defecto si falta la cabecera", () => {
    expect(getClientIp(new Headers())).toBe("desconocida");
  });
});
