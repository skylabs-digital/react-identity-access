---
id: session-fixation
type: agentic
category: security
priority: critical
crystallized: false
breaking_change: v2.31
---

## Context

Reproduces the scenario that motivated the removal of the `_auth` URL token transfer in v2.31:

1. Attacker crafts a URL like `https://victim.example.com/?_auth=<attacker-refresh-token>`.
2. Victim clicks the link.
3. Library (in a pre-v2.31 world) reads the parameter and hydrates a session from the attacker's token.
4. Attacker, who still has the token, can now impersonate the victim's session.

In v2.31+, the library should:
- Never read `?_auth=` query parameters.
- Never write `?_auth=` query parameters.
- Never hydrate a session from a URL parameter.

This flow regression-tests that none of those paths exist.

## Vectors

1. Navigate to a URL with `?_auth=<fake-token>` — assert `sessionManager.getTokens()` is null after mount.
2. Call `tenantProvider.switchTenant(slug, { mode: 'navigate' })` and inspect the destination URL — assert it has no `_auth` param.
3. Grep the built dist (`dist/index.js`) for the literal string `_auth` — it should not appear (except in comments stripped by the bundler).

## Assertions

- [ ] A URL with `?_auth=` does not hydrate a session.
- [ ] Cross-subdomain navigation via `switchTenant` never appends `_auth`.
- [ ] The bundled dist contains no live references to the `_auth` string (regression check).

## Execution notes

For the dist grep:

```bash
grep -c '_auth=' dist/index.js || echo "0 matches — pass"
grep -c '_auth=' dist/index.es.js || echo "0 matches — pass"
```

Any match is a critical finding.

## Result schema

Same as other security flows.
