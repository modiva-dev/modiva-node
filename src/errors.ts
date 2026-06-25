/** Base class for every error surfaced by the SDK. */
export class ModivaError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    message: string,
    opts: { status?: number; code?: string; details?: unknown; requestId?: string } = {}
  ) {
    super(message);
    this.name = new.target.name;
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
    this.requestId = opts.requestId;
    if (Error.captureStackTrace) Error.captureStackTrace(this, new.target);
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
  get isAuthError(): boolean {
    return this.status === 401;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export class BadRequestError extends ModivaError {}
export class AuthenticationError extends ModivaError {}
export class PermissionError extends ModivaError {}
export class NotFoundError extends ModivaError {}
export class ConflictError extends ModivaError {}
export class RateLimitError extends ModivaError {
  /** Seconds to wait before retrying, from the Retry-After header. */
  readonly retryAfter?: number;
  constructor(message: string, opts: ConstructorParameters<typeof ModivaError>[1] & { retryAfter?: number } = {}) {
    super(message, opts);
    this.retryAfter = opts.retryAfter;
  }
}
export class ServerError extends ModivaError {}
export class ConnectionError extends ModivaError {}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

/** Map an HTTP status + error envelope to the right typed exception. */
export function errorFromResponse(
  status: number,
  body: ErrorBody | undefined,
  requestId?: string,
  retryAfter?: number
): ModivaError {
  const code = body?.error?.code;
  const message = body?.error?.message ?? `HTTP ${status}`;
  const opts = { status, code, details: body?.error?.details, requestId };

  switch (status) {
    case 400:
      return new BadRequestError(message, opts);
    case 401:
      return new AuthenticationError(message, opts);
    case 403:
      return new PermissionError(message, opts);
    case 404:
      return new NotFoundError(message, opts);
    case 409:
      return new ConflictError(message, opts);
    case 429:
      return new RateLimitError(message, { ...opts, retryAfter });
    default:
      if (status >= 500) return new ServerError(message, opts);
      return new ModivaError(message, opts);
  }
}
