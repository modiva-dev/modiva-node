import type { HttpClient } from "./http.js";
import type { PaginationMeta } from "./types.js";

/**
 * Auto-pager: lazily walk every page of a list endpoint. Tolerates endpoints
 * that return a bare `{ data }` (no `meta`) by yielding a single page.
 *
 * ```ts
 * for await (const post of client.social.posts.listAll()) { ... }
 * ```
 */
export async function* autoPaginate<T>(
  http: HttpClient,
  path: string,
  query: Record<string, string | number | boolean | undefined> = {}
): AsyncGenerator<T, void, unknown> {
  let page = 1;
  for (;;) {
    const env = await http.requestEnvelope<T[]>("GET", path, { query: { ...query, page } });
    const items = env.data ?? [];
    for (const item of items) yield item;

    const meta: PaginationMeta | undefined = env.meta;
    if (!meta || page >= meta.totalPages || items.length === 0) return;
    page++;
  }
}
