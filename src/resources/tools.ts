import type { HttpClient } from "../http.js";
import type { Tool, ToolResult } from "../types.js";

/**
 * Generic access to the full per-integration tool surface (100+ tools across
 * every connected integration) without hand-typing each one.
 */
export class Tools {
  constructor(private readonly http: HttpClient) {}

  /** List every tool available to your connected integrations. */
  list(): Promise<Tool[]> {
    return this.http.request<Tool[]>("GET", "/tools");
  }

  /** Execute a tool against a connected integration. */
  execute(
    integration: string,
    tool: string,
    params: { connectionId?: string; params?: Record<string, unknown> } = {}
  ): Promise<ToolResult> {
    return this.http.request<ToolResult>(
      "POST",
      `/tools/${encodeURIComponent(integration)}/${encodeURIComponent(tool)}`,
      { body: params, idempotencyKey: true }
    );
  }
}
