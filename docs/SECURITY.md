# Security

This document describes the controls that are actually implemented in this repository, how
they were verified, and what still belongs to deployment hardening. It does not claim that
the application is unbreakable.

## Authentication

- Passwords are hashed with **bcrypt** (`bcryptjs`), never stored or logged in plaintext.
- Sessions are server-side rows (`sessions` table) referenced by an **HTTP-only, `SameSite=Lax`,
  `Secure` in production** cookie. Session TTL is configurable (`SESSION_TTL_DAYS`, default 7).
- Login is rate limited per IP (`express-rate-limit`) and returns an identical message for a
  wrong email and a wrong password, so the endpoint does not disclose which accounts exist.
- Session revocation is real: logout and “sign out other sessions” delete server rows, so a
  copied cookie stops working immediately.
- The first-run administrator screen (`/admin`) is available **only while no administrator
  exists**. After that it is inert; no default credentials ship with the code.

## Authorization

- Every `/api/admin/*` route runs `requireAuth` and `requirePermission(...)` server-side.
- Roles and permissions are database rows (`roles`, `permissions`, `role_permissions`); the
  UI mirrors them but never enforces them. Client-side checks are cosmetic only.
- Read-only accounts are covered by an integration test that asserts a 403 on writes.

## CSRF

- A `csrf` cookie is paired with an `X-CSRF-Token` header (double-submit). All state-changing
  admin requests are rejected without a matching token.
- Cookies are `SameSite=Lax`, which blocks cross-site form posts from carrying the session.

## Input handling

- Every request body and query is validated with **Zod** schemas before it reaches the
  database; invalid input returns a structured 400, never a stack trace.
- SQL is executed through `better-sqlite3` **prepared statements** with bound parameters —
  no string interpolation of user input, so SQL injection has no route in.
- React escapes all rendered content by default. Blog and case-study bodies are stored as
  plain text/Markdown-ish content and rendered as text nodes, not raw HTML, so stored XSS
  cannot execute.
- Errors are sanitized: production responses carry a message and status, never internals.

## Transport and headers

`helmet` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Cross-Origin-Opener-Policy`, `X-DNS-Prefetch-Control`, `X-Permitted-Cross-Domain-Policies`
and HSTS in production. `x-powered-by` is disabled.

CORS uses an allowlist: `PUBLIC_URL` plus `CORS_ORIGINS`, **plus the origin the request was
served from**. A foreign origin is rejected by omitting the CORS headers — it is never
answered with an error status. (Rejecting by throwing previously produced a 500 on every
`crossorigin` asset request, which took the whole site down; a regression test now guards it.)

## Uploads

- Media and resume uploads go through `multer` with a MIME allowlist, an extension check and
  a size limit; filenames are regenerated server-side.
- Files are stored outside the client bundle and served from `/uploads` with
  `X-Content-Type-Options: nosniff` and a restrictive `Content-Security-Policy`.
- Nothing sensitive is placed in a publicly readable directory; uploads are never executed.

## Realtime

- Socket.IO connections are authenticated during the handshake from the session cookie;
  anonymous sockets are disconnected with `unauthorized`.
- Events are emitted only into the `admins` room. Contact payloads and admin presence are
  never broadcast to public sockets, and handler input is validated.

## Auditing and hygiene

- `activity_logs` records administrative actions with actor, action and timestamp.
- Secrets live in environment variables only; `.env` is git-ignored and `.env.example`
  contains placeholders.
- Dependency security is scanned with the platform scanner (OSV advisories) — 616 packages
  checked, 0 findings at the last run. Re-run it after any dependency change.

## Verified by automated tests

`npm test` (Vitest + Supertest + real Socket.IO client) asserts: invalid credentials are
rejected without leaking which field failed, unauthenticated admin access returns 401,
read-only roles are denied writes, CSRF-less mutations are refused, contact submissions are
validated and persisted, and `contact:new` reaches authenticated admin sockets only.

## Deployment hardening still recommended

- Enable a strict Content-Security-Policy (currently disabled because the Swagger reference
  page and the animated UI rely on inline styles).
- Terminate TLS in front of the app and keep `NODE_ENV=production` so cookies are `Secure`.
- Set `PUBLIC_URL` to the real origin.
- Put backups on a schedule (see `docs/DEPLOYMENT.md`) and restrict access to the database file.
- Rotate the administrator password if it was ever shared in a chat, ticket or commit.
