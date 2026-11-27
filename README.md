# IBSAM® — Portfolio & Content Management Ecosystem

A production-grade developer portfolio **and** full-stack content management console for
**Muhammad Ibsam** — full-stack web developer, Karachi, Pakistan.

Not a template: every public page, admin screen, API endpoint and realtime event below is
wired to a real database through a real Express server. Nothing is mocked.

**Live application:** https://vp65bk5xmp.dev.ap-jt.com

---

## OMEGA layer (3D / WebGL / GLSL)

The public experience is built on a hand-written Three.js layer rather than an off-the-shelf
scene kit. Everything below is custom geometry and shader code in `client/src/three/`.

| Module | What it does |
| --- | --- |
| `three/engine.ts` | Scene lifecycle: mount, resize, render loop, raycast picking, disposal, `prefersReducedMotion`, WebGL capability probe and `probeShader()` for real GLSL compile status |
| `three/heroSculpture.ts` | Hero installation — torus stack, independent orbital rings, procedural particle field, custom vertex-displacement + fresnel metallic shader, scroll-driven camera states |
| `three/scenes.ts` | `createProjectUniverse()` (nine-node project graph, clickable) and `createTechConstellation()` (18 technology nodes) |
| `components/SceneCanvas.tsx` | Lazy React host: IntersectionObserver pause off-screen, context loss recovery, and a static fallback if WebGL is unavailable |

**Digital Lab (`/lab`)** — seven experiments, every control wired to real uniforms or scene
graph rebuilds: Particle Dimension (density/speed/size), Liquid Metallic (distortion/lighting),
Orbital Engine (rotation/structures/geometry), GLSL Playground (intensity/pattern/hue),
3D Typography (material/lighting/camera), Motion Lab (timeline play/pause/rate) and CSS Depth
Studio (depth/rotation/layers/presets, no WebGL required).

**Performance** — `three` is split into its own lazy chunk (625 kB raw / 168 kB gzip) and only
loads where a scene mounts. Scenes pause when off-screen, dispose geometries/materials on
unmount, cut particle counts on mobile, and degrade to a styled static mark when WebGL or a
shader fails. `prefers-reduced-motion` disables camera and idle animation.

**Content** — `server/src/db/seedOmega.ts` inserts the nine owner-supplied projects per slug,
so the previously verified projects (LotteryChain, TrustChain, this portfolio) and any admin
edits are preserved across restarts.

---

## What is inside

### Public site (`/`)
| Route | Purpose |
| --- | --- |
| `/` | OMEGA hero (3D sculpture), statement, featured work, constellation, journey, CTA |
| `/work` | Asymmetric nine-project gallery: filters + search, 3D project universe, keyboard list |
| `/work/:slug` | Case study: overview, stack, gallery, GitHub/live links |
| `/case-studies` | Long-form case study index |
| `/about` | Profile, story, education, certifications, achievements |
| `/skills`, `/experience`, `/services`, `/education`, `/achievements`, `/certifications` | Content pages backed by the database |
| `/lab` | Digital Lab — seven interactive WebGL / GLSL / CSS experiments |
| `/writing` | Blog index |
| `/writing/:slug` | Article detail with metadata and structured data |
| `/testimonials`, `/resume` | Testimonials and résumé |
| `/contact` | Validated contact form persisted to the database |
| `/legal/privacy`, `/legal/terms` | Legal pages |
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

## Where data is stored (and what survives a deploy)

This is a **single-process Node application with an embedded SQLite database**. There is no
separate database server, no external cache and no third-party storage provider.

| Data | Location | Written by |
| --- | --- | --- |
| Projects, skills, experience, education, certifications, testimonials, blog posts, services, site settings | `$DATA_DIR/ibsam.db` | `server/src/routes/admin.ts` CRUD |
| Contact messages | `$DATA_DIR/ibsam.db` (`contact_messages`) | `POST /api/contact` |
| Admin accounts, roles, permissions, sessions | `$DATA_DIR/ibsam.db` (`users`, `sessions`, `roles`, `permissions`) | `server/src/routes/auth.ts` |
| Page views (analytics) | `$DATA_DIR/ibsam.db` (`page_views`) | `POST /api/analytics/pageview` |
| Uploaded media, resume files | `$DATA_DIR/uploads/` on disk | `server/src/routes/media.ts` (multer disk storage) |
| Activity log / audit trail | `$DATA_DIR/ibsam.db` (`activity_logs`) | every privileged mutation |

Resolution order (`server/src/config.ts`):

```
DATA_DIR       default ./data          → creates ./data and ./data/uploads at boot
DATABASE_FILE  default $DATA_DIR/ibsam.db
```

### The important limitation

The container filesystem is **not durable**. On this hosting plan there is no persistent disk,
so `/app/data` (and therefore the database and every upload) is recreated on each deploy or
restart. What that means in practice:

- **Seeded content returns automatically.** `server/src/db/seed.ts` and `seedOmega.ts` are
  idempotent and re-run at boot, so the nine projects and the base content reappear.
- **Admin-authored changes do not.** Edits made in the studio, uploaded images, contact messages
  and analytics history live only inside the running container and are lost when it is replaced.

### Making it durable (requires a paid plan)

Persistent disks are not part of the Free plan. To keep real content, attach a persistent disk
(Starter $5/month or Pro) and mount it at `/app/data`, then deploy with:

```
DATA_DIR=/app/data
```

That single variable redirects both the SQLite file and the upload directory onto durable
storage — no code change is required. Until a disk is attached, treat the deployed site as a
**content preview**: author the real content once persistence is in place.

### Administrator bootstrap

No admin account is created automatically and no credentials are hardcoded. Create the first
account in one of two ways:

```bash
# one-time CLI (reads ADMIN_EMAIL / ADMIN_PASSWORD from the environment)
npm run seed:admin
```

…or open `/admin` while no account exists — the console shows a one-time bootstrap screen.

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
