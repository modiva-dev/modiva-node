/**
 * @modiva/node — Official Node.js / TypeScript SDK for the Modiva API.
 *
 * One typed client for 94 social & ads integrations: auth, retries, pagination,
 * idempotency and the full tool surface, already handled.
 */
export { Modiva } from "./client.js";
export * as webhooks from "./webhooks.js";
export {
  ModivaError,
  BadRequestError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  ConnectionError,
} from "./errors.js";
export type {
  ClientOptions,
  Connection,
  Post,
  CreatePostParams,
  Tool,
  ToolResult,
  TargetParams,
  PaginationMeta,
  WebhookEvent,
  WebhookEventType,
} from "./types.js";
