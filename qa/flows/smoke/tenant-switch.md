---
id: tenant-switch
type: agentic
category: smoke
priority: medium
crystallized: false
---

## Context

Verify that switching tenants within the same origin (selector mode) does not leak session state between tenants. This is a smoke check for the multi-tenant UX path that doesn't involve cross-subdomain cookies.

## Helpers

- [qa/helpers/harness.md](../../helpers/harness.md)
- [qa/helpers/public-api.md](../../helpers/public-api.md)

## Steps

1. Start scenario `tenant-switch`.
2. Log in a tab with a token that embeds `tenantId: 'tenant-a'`.
3. Record the access token.
4. Simulate a tenant switch by clearing the session and logging in again with a token embedding `tenantId: 'tenant-b'`.
5. Assert the new token is different.
6. Assert `refreshRequestCount(s)` equals the number of explicit refreshes triggered (none, for this flow).

## Assertions

- [ ] After clearSession, storage is empty.
- [ ] New session has the new tenant id in the JWT payload.
- [ ] No cross-tenant token leakage in storage.

## Result schema

Same as other smoke flows.
