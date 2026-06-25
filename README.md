# @modiva/node

Official Node.js / TypeScript SDK for the [Modiva API](https://modiva.ai) — one
typed client for 94 social & ads integrations. Auth, retries, pagination,
idempotency and the full tool surface, already handled.

```bash
npm install @modiva/node
```

## Authentication

All requests use a Bearer key. The SDK reads `MODIVA_API_KEY` by default (create
one in the dashboard → MCP keys), or pass it explicitly.

```ts
import { Modiva } from "@modiva/node";

const modiva = new Modiva(); // or new Modiva({ apiKey: "mk_..." })
```

## Quickstart

```ts
// List connected accounts
const connections = await modiva.connections.list();

// Publish now (or schedule with scheduledAt)
const post = await modiva.social.posts.create({
  connectionId: connections[0].id,
  text: "Hello from Modiva 👋",
  scheduledAt: "2026-07-01T09:00:00Z",
});

// Reply to comments / send DMs
await modiva.social.comments.reply("comment_123", { text: "Thanks!" });
await modiva.social.messages.send({
  integrationSlug: "instagram",
  threadId: "t_1",
  text: "On it!",
});

// The full tool surface, for anything not covered by a typed method
const tools = await modiva.tools.list();
await modiva.tools.execute("youtube", "analytics_post", { params: { videoId: "..." } });
```

## Pagination

```ts
for await (const post of modiva.social.posts.listAll()) {
  console.log(post.id);
}
```

## Errors

```ts
import { RateLimitError, NotFoundError } from "@modiva/node";

try {
  await modiva.connections.get("missing");
} catch (err) {
  if (err instanceof NotFoundError) { /* ... */ }
  if (err instanceof RateLimitError) console.log(err.retryAfter);
}
```

`429` and `5xx` are retried automatically with exponential backoff (honoring
`Retry-After`); create calls send an `Idempotency-Key` so retries are safe.

## Webhooks

Verify and parse inbound deliveries (`Modiva-Signature: t=...,v1=...`):

```ts
import { webhooks } from "@modiva/node";

app.post("/webhooks/modiva", (req, res) => {
  const event = webhooks.constructEvent(
    req.rawBody,                       // the raw string, not parsed JSON
    req.headers["modiva-signature"],
    process.env.MODIVA_WEBHOOK_SECRET!
  );
  if (event.type === "message.received") { /* ... */ }
  res.sendStatus(200);
});
```

## License

MIT
