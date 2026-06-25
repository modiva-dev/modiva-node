import { afterEach, describe, expect, it, vi } from "vitest";
import { Modiva, RateLimitError, NotFoundError } from "../src/index.js";
import { verify, constructEvent } from "../src/webhooks.js";
import { createHmac } from "node:crypto";

function mockFetch(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const fn = vi.fn(async (url: URL | string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), {
      status: r.status,
      headers: { "content-type": "application/json", ...(r.headers ?? {}) },
    });
  });
  vi.stubGlobal("fetch", fn);
  return { calls };
}

const client = () => new Modiva({ apiKey: "test_key", baseUrl: "https://api.test", maxRetries: 2 });

afterEach(() => vi.unstubAllGlobals());

describe("auth + requests", () => {
  it("sends the bearer token and hits the versioned path", async () => {
    const { calls } = mockFetch([{ status: 200, body: { data: [{ id: "c1" }] } }]);
    const conns = await client().connections.list();
    expect(conns).toEqual([{ id: "c1" }]);
    expect(calls[0].url).toBe("https://api.test/api/v1/connections");
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe("Bearer test_key");
  });

  it("sends an Idempotency-Key on create calls", async () => {
    const { calls } = mockFetch([{ status: 201, body: { data: { id: "p1" } } }]);
    await client().social.posts.create({ connectionId: "c1", text: "hi" });
    expect((calls[0].init.headers as Record<string, string>)["idempotency-key"]).toBeTruthy();
  });
});

describe("errors", () => {
  it("maps 404 to NotFoundError", async () => {
    mockFetch([{ status: 404, body: { error: { code: "NOT_FOUND", message: "nope" } } }]);
    await expect(client().connections.get("x")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("retries", () => {
  it("retries 429 honoring Retry-After then succeeds", async () => {
    const { calls } = mockFetch([
      { status: 429, body: { error: { code: "RATE_LIMITED", message: "slow down" } }, headers: { "retry-after": "0" } },
      { status: 200, body: { data: [] } },
    ]);
    await client().connections.list();
    expect(calls.length).toBe(2);
  });

  it("gives up after maxRetries and throws RateLimitError", async () => {
    mockFetch([{ status: 429, body: { error: { code: "RATE_LIMITED", message: "no" } }, headers: { "retry-after": "0" } }]);
    await expect(client().connections.list()).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe("webhooks.verify", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ id: "evt_1", type: "post.published", data: {} });
  const t = Math.floor(Date.now() / 1000);
  const sig = `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

  it("accepts a valid signature", () => {
    expect(verify(body, sig, secret)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verify(body + "x", sig, secret)).toBe(false);
  });
  it("rejects an old timestamp", () => {
    const old = t - 10_000;
    const oldSig = `t=${old},v1=${createHmac("sha256", secret).update(`${old}.${body}`).digest("hex")}`;
    expect(verify(body, oldSig, secret)).toBe(false);
  });
  it("constructEvent parses a verified event", () => {
    expect(constructEvent(body, sig, secret).type).toBe("post.published");
  });
});
