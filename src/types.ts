export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface Connection {
  id: string;
  integrationSlug: string;
  externalAccountId?: string;
  status: "connected" | "revoked" | "error" | "pending";
  scopes?: string[];
  createdAt?: string;
}

export interface Post {
  id: string;
  connectionId: string;
  integrationSlug: string;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  content?: Record<string, unknown>;
  mediaUrls?: string[];
  scheduledAt?: string | null;
  publishedAt?: string | null;
  externalId?: string | null;
  permalink?: string | null;
}

export interface CreatePostParams {
  connectionId: string;
  text?: string;
  link?: string;
  mediaUrls?: string[];
  scheduledAt?: string | null;
  options?: Record<string, unknown>;
}

export interface Tool {
  integrationSlug: string;
  toolName: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TargetParams {
  integrationSlug: string;
  connectionId?: string;
}

export type WebhookEventType =
  | "post.published"
  | "post.failed"
  | "message.received"
  | "comment.received"
  | "connection.authorized"
  | "connection.revoked"
  | "connection.error"
  | "analytics.updated";

export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: WebhookEventType;
  createdAt: string;
  data: T;
}

export interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
