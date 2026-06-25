import { randomUUID } from "node:crypto";
import { ConnectionError, errorFromResponse } from "./errors.js";
import type { ApiEnvelope } from "./types.js";

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** When set on a POST, the request becomes retry-safe and sends the header. */
  idempotencyKey?: string | true;
}

const RETRYABLE_METHODS = new Set(["GET", "DELETE"]);

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(opts: { apiKey?: string; baseUrl?: string; timeout?: number; maxRetries?: number }) {
    const apiKey = opts.apiKey ?? process.env.MODIVA_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing Modiva API key. Pass { apiKey } or set the MODIVA_API_KEY env var."
      );
    }
    this.apiKey = apiKey;
    const base = opts.baseUrl ?? process.env.MODIVA_BASE_URL ?? "https://api.modiva.ai";
    this.baseUrl = `${base.replace(/\/$/, "")}/api/v1`;
    this.timeout = opts.timeout ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 2;
  }

  /** Make a request and return the parsed `data` field of the envelope. */
  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const env = await this.requestEnvelope<T>(method, path, opts);
    return env.data;
  }

  /** Make a request and return the full `{ data, meta }` envelope (for paging). */
  async requestEnvelope<T>(
    method: string,
    path: string,
    opts: RequestOptions = {}
  ): Promise<ApiEnvelope<T>> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiKey}`,
      accept: "application/json",
    };
    let bodyStr: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      bodyStr = JSON.stringify(opts.body);
    }
    if (opts.idempotencyKey) {
      headers["idempotency-key"] =
        opts.idempotencyKey === true ? randomUUID() : opts.idempotencyKey;
    }

    const retryable =
      RETRYABLE_METHODS.has(method) || (method === "POST" && Boolean(opts.idempotencyKey));

    let attempt = 0;
    // attempts = initial try + up to maxRetries retries
    for (;;) {
      try {
        const res = await this.fetchWithTimeout(url, method, headers, bodyStr);
        const requestId = res.headers.get("x-request-id") ?? undefined;

        if (res.ok) {
          if (res.status === 204) return { data: undefined as T };
          return (await res.json()) as ApiEnvelope<T>;
        }

        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        if (retryable && shouldRetryStatus(res.status) && attempt < this.maxRetries) {
          attempt++;
          await sleep(backoffMs(attempt, retryAfter));
          continue;
        }
        let errBody: unknown;
        try {
          errBody = await res.json();
        } catch {
          errBody = undefined;
        }
        throw errorFromResponse(res.status, errBody as never, requestId, retryAfter);
      } catch (err) {
        // Re-throw mapped API errors untouched; only wrap transport failures.
        if (isModivaError(err)) throw err;
        if (retryable && attempt < this.maxRetries) {
          attempt++;
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new ConnectionError(
          `Request to ${method} ${path} failed: ${(err as Error).message}`
        );
      }
    }
  }

  private async fetchWithTimeout(
    url: URL,
    method: string,
    headers: Record<string, string>,
    body?: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      return await fetch(url, { method, headers, body, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

function isModivaError(err: unknown): boolean {
  return (
    err instanceof Error &&
    [
      "ModivaError",
      "BadRequestError",
      "AuthenticationError",
      "PermissionError",
      "NotFoundError",
      "ConflictError",
      "RateLimitError",
      "ServerError",
    ].includes(err.constructor.name)
  );
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const n = Number(header);
  return Number.isFinite(n) ? n : undefined;
}

function backoffMs(attempt: number, retryAfterSeconds?: number): number {
  if (retryAfterSeconds !== undefined) return retryAfterSeconds * 1000;
  const base = Math.min(1000 * 2 ** (attempt - 1), 8000);
  return base + Math.floor(Math.random() * 250); // jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
