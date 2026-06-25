import { HttpClient } from "./http.js";
import { Connections } from "./resources/connections.js";
import { Social } from "./resources/social.js";
import { Tools } from "./resources/tools.js";
import * as webhooks from "./webhooks.js";
import type { ClientOptions } from "./types.js";

/**
 * The Modiva client. One typed entry point for 94 social & ads integrations.
 *
 * ```ts
 * import { Modiva } from "@modiva/node";
 * const modiva = new Modiva(); // reads MODIVA_API_KEY
 * const conns = await modiva.connections.list();
 * ```
 */
export class Modiva {
  readonly connections: Connections;
  readonly social: Social;
  readonly tools: Tools;
  /** Stateless helpers to verify inbound webhook deliveries. */
  readonly webhooks = webhooks;

  constructor(options: ClientOptions = {}) {
    const http = new HttpClient(options);
    this.connections = new Connections(http);
    this.social = new Social(http);
    this.tools = new Tools(http);
  }
}
