# IBSAM® — Portfolio & Content Management Ecosystem

A production-grade developer portfolio **and** full-stack content management console for
**Muhammad Ibsam** — full-stack web developer, Karachi, Pakistan.

Not a template: every public page, admin screen, API endpoint and realtime event below is
wired to a real database through a real Express server. Nothing is mocked.

**Live application:** https://vp65bk5xmp.dev.ap-jt.com

---

## What is inside

### Public site (`/`)
| Route | Purpose |
| --- | --- |
| `/` | Animated hero, 3D scene, featured work, skills, services, timeline, CTA |
| `/work` | Project listing with search, category filters and featured ordering |
| `/work/:slug` | Project detail: gallery, stack, GitHub/live links, case-study body |
| `/about` | Profile, story, education, certifications, achievements |
| `/writing` | Blog index |
| `/writing/:slug` | Article detail with metadata and structured data |
| `/contact` | Validated contact form persisted to the database |
| `/privacy`, `/terms` | Legal pages |
| `*` | Custom 404 |

### Admin console (`/admin`)
Dashboard overview (counts, unread messages, live notifications), project/skill/experience/
education/certification/testimonial/blog CRUD, contact-message inbox (read, archive, delete),
media library with uploads, resume management, site settings, security page (sessions,
password change), realtime presence.

First visit to `/admin` with no administrator present shows a **first-run setup screen**.
It disappears permanently once an administrator exists.

### Real-time (`Socket.IO`)
`contact:new`, `contact:updated`, `notification:new`, `project:created`, `project:updated`,
`project:deleted`, `admin:presence` — delivered only to authenticated admin sockets
(room-based authorization, session-cookie handshake, rate limiting).

---

## Stack

- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS + hand-written CSS architecture,
  React Three Fiber / Drei / Three.js (lazy-loaded), GSAP ScrollTrigger, Framer Motion, Lucide.
- **Backend** — Node.js, Express, TypeScript, Zod validation, Helmet, CORS allowlist,
  rate limiting, cookie sessions with CSRF double-submit, bcrypt password hashing,
  Socket.IO, Swagger/OpenAPI at `/api/docs`.
- **Database** — SQLite through `better-sqlite3` with a versioned schema, migrations and seed
  data (`server/src/db`). Relational design: users, roles, permissions, sessions, projects,
  project categories/images, skills, experience, education, certifications, testimonials,
  blog posts/categories, contact messages, notifications, media assets, resumes, settings,
  activity logs.
- **Tests** — Vitest + Supertest + real Socket.IO client against the real app and real database.

---

## Quick start

```bash
npm install
cp .env.example .env      # optional: the app boots with zero external credentials
npm run dev               # API on :3000, Vite dev server on :5173
```

Create the administrator on first visit to `http://localhost:5173/admin`, or:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' npm run seed:admin
```

### Scripts

| Script | Action |
| --- | --- |
| `npm run dev` | API + Vite dev server together |
| `npm run build` | Vite production bundle + server TypeScript build |
| `npm start` | Run the production server (serves the built client and the API) |
| `npm run typecheck` | TypeScript checks for client and server |
| `npm run lint` | ESLint |
| `npm test` | Vitest integration suite (API, auth, RBAC, realtime) |
| `npm run seed:admin` | Create an administrator from environment variables |
| `npm run db:reset` | Remove runtime database/uploads and re-migrate on next boot |
| `npm run package` | Build a clean source ZIP (no `node_modules`, builds, data or secrets) |

---

## Environment variables

All optional; see `.env.example` for the documented set.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `production` enables secure cookies, HSTS, strict checks |
| `PUBLIC_URL` | `http://localhost:$PORT` | Canonical origin for cookies, CORS and metadata |
| `CORS_ORIGINS` | – | Extra comma-separated browser origins |
| `DATA_DIR` / `DATABASE_FILE` | `./data` | SQLite location (created automatically) |
| `SESSION_TTL_DAYS` | `7` | Session lifetime |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | – | Optional first-run bootstrap account |

Never commit a real `.env`. The application runs with no external credentials at all —
no paid service is required.

---

## API

- Interactive reference: **`/api/docs`** (Swagger UI), machine spec: `/api/openapi.json`
- Health: `GET /api/health` (liveness), `GET /api/health/ready` (database readiness)
- Public: `/api/site`, `/api/projects`, `/api/projects/:slug`, `/api/skills`, `/api/experience`,
  `/api/education`, `/api/certifications`, `/api/testimonials`, `/api/posts`, `/api/stats`,
  `POST /api/contact`
- Admin (session + CSRF protected): `/api/admin/*` for every resource, media, resume, settings
- Consistent envelope: `{ success: true, data }` or `{ success: false, error: { message, status } }`
- Pagination, filtering and sorting on list endpoints; 401/403 enforced server-side.

---

## Security

Implemented controls, threat model and hardening checklist: **[docs/SECURITY.md](docs/SECURITY.md)**.
Deployment, backups and operations: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

Highlights: bcrypt hashing, HTTP-only `SameSite` cookies, CSRF double-submit tokens,
server-side RBAC on every admin route, login rate limiting, Zod validation everywhere,
Helmet headers, upload type/size validation, parameterized SQL, audit logging and
sanitized error responses.

---

## Deployment

The repository ships a multi-stage Alpine `Dockerfile` that builds the client and server,
runs as a non-root user and serves everything from one Node process on `PORT`:

```bash
docker build -t ibsam-portfolio .
docker run -p 3000:3000 -e NODE_ENV=production -e PUBLIC_URL=https://your-host ibsam-portfolio
```

Full instructions, CI notes and backup/restore procedure: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## Repository layout

```
client/            React app (public site + admin console)
  src/pages/       Public pages
  src/admin/       Admin console, auth + realtime contexts
  src/components/  Layout, hero scene, error boundary, icons
server/
  src/app.ts       Express app: security middleware, routers, SPA hosting
  src/routes/      auth, public, admin, media, docs
  src/db/          schema, migrations, seed
  src/lib/         auth, http, realtime, validation
  tests/           Vitest + Supertest + Socket.IO integration suite
docs/              Security and deployment documentation
scripts/           Source packaging helper
```

---

© IBSAM® — Muhammad Ibsam. Content, brand and imagery belong to their owner.
