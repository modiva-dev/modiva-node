import type { HttpClient } from "../http.js";
import { autoPaginate } from "../pagination.js";
import type { Connection } from "../types.js";

export class Connections {
  constructor(private readonly http: HttpClient) {}

  /** List connected accounts. */
  list(): Promise<Connection[]> {
    return this.http.request<Connection[]>("GET", "/connections");
  }

  /** Iterate every connection across all pages. */
  listAll(): AsyncGenerator<Connection> {
    return autoPaginate<Connection>(this.http, "/connections");
  }

  /** Get a single connection by id. */
  get(id: string): Promise<Connection> {
    return this.http.request<Connection>("GET", `/connections/${encodeURIComponent(id)}`);
  }

  /** Disconnect an account. */
  delete(id: string): Promise<{ id: string; deleted: boolean }> {
    return this.http.request("DELETE", `/connections/${encodeURIComponent(id)}`);
  }

  /** Generate a hosted OAuth connect URL for one of your users. */
  createUrl(params: { integrationSlug: string; redirectUri?: string }): Promise<{ url: string }> {
    return this.http.request("POST", "/connect/url", { body: params, idempotencyKey: true });
  }
}
