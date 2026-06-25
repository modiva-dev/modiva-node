# Changelog

## 0.1.0

- Initial release: `Modiva` client with `connections`, `social.posts`,
  `social.comments`, `social.messages`, `social.analytics`, and the generic
  `tools` surface.
- Automatic retries (429/5xx + `Retry-After`), auto-pager, `Idempotency-Key`
  on create calls, typed error taxonomy, and `webhooks.verify` / `constructEvent`.
