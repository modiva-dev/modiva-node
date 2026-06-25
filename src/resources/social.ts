import type { HttpClient } from "../http.js";
import { autoPaginate } from "../pagination.js";
import type { CreatePostParams, Post, TargetParams, ToolResult } from "../types.js";

class Posts {
  constructor(private readonly http: HttpClient) {}

  /** Publish now, or schedule when `scheduledAt` is set. Idempotent. */
  create(params: CreatePostParams): Promise<Post> {
    return this.http.request<Post>("POST", "/social/posts", {
      body: params,
      idempotencyKey: true,
    });
  }

  list(): Promise<Post[]> {
    return this.http.request<Post[]>("GET", "/social/posts");
  }

  listAll(): AsyncGenerator<Post> {
    return autoPaginate<Post>(this.http, "/social/posts");
  }

  get(id: string): Promise<Post> {
    return this.http.request<Post>("GET", `/social/posts/${encodeURIComponent(id)}`);
  }

  delete(id: string): Promise<{ id: string; deleted: boolean }> {
    return this.http.request("DELETE", `/social/posts/${encodeURIComponent(id)}`);
  }
}

class Comments {
  constructor(private readonly http: HttpClient) {}

  list(target: TargetParams): Promise<ToolResult> {
    return this.http.request<ToolResult>("GET", "/social/comments", { query: { ...target } });
  }

  reply(commentId: string, params: { text: string; cid?: string }): Promise<ToolResult> {
    return this.http.request<ToolResult>(
      "POST",
      `/social/comments/${encodeURIComponent(commentId)}/reply`,
      { body: params }
    );
  }
}

class Messages {
  constructor(private readonly http: HttpClient) {}

  list(target: TargetParams): Promise<ToolResult> {
    return this.http.request<ToolResult>("GET", "/social/messages", { query: { ...target } });
  }

  send(params: { threadId: string; text: string } & TargetParams): Promise<ToolResult> {
    return this.http.request<ToolResult>("POST", "/social/messages", { body: params });
  }
}

class Analytics {
  constructor(private readonly http: HttpClient) {}

  account(target: TargetParams): Promise<ToolResult> {
    return this.http.request<ToolResult>("GET", "/social/analytics", { query: { ...target } });
  }
}

export class Social {
  readonly posts: Posts;
  readonly comments: Comments;
  readonly messages: Messages;
  readonly analytics: Analytics;

  constructor(http: HttpClient) {
    this.posts = new Posts(http);
    this.comments = new Comments(http);
    this.messages = new Messages(http);
    this.analytics = new Analytics(http);
  }
}
