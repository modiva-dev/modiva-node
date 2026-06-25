import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookEvent } from "./types.js";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

function parseSignatureHeader(header: string): { t: number; v1: string } | null {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !parts.v1) return null;
  return { t, v1: parts.v1 };
}

export interface VerifyOptions {
  /** Max age of the signature timestamp, in seconds (replay protection). */
  toleranceSeconds?: number;
}

/**
 * Verify a Modiva webhook delivery. The `Modiva-Signature` header is
 * `t=<unixSeconds>,v1=<hex>`, where the signed string is `"{t}.{rawBody}"`
 * HMAC-SHA256'd with the endpoint secret. Pass the RAW request body string
 * exactly as received (do not re-serialize). Returns false on any mismatch or
 * when the timestamp is older than the tolerance window.
 */
export function verify(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  options: VerifyOptions = {}
): boolean {
  if (!signatureHeader) return false;
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.t) > tolerance) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parsed.t}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parsed.v1, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify a delivery and parse it into a typed event, throwing on an invalid
 * signature — the convenient one-call path for webhook handlers.
 */
export function constructEvent<T = Record<string, unknown>>(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  options?: VerifyOptions
): WebhookEvent<T> {
  if (!verify(rawBody, signatureHeader, secret, options)) {
    throw new Error("Invalid Modiva webhook signature");
  }
  return JSON.parse(rawBody) as WebhookEvent<T>;
}
