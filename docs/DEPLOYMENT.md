# Deployment & Operations

## Runtime model

One Node process serves both the API and the built client:

- `npm run build` → Vite bundle into `client/dist`, server compiled into `server/dist`
- `npm start` → `node server/dist/index.js` on `0.0.0.0:$PORT`
- Express serves `/api/*` and hosts `client/dist` with an SPA fallback, so deep links such as
  `/work/trustchain` work on a hard refresh.

## Environment

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` (enables Secure cookies + HSTS) |
| `PORT` | injected by the platform |
| `PUBLIC_URL` | the public origin, e.g. `https://your-app.example.com` |
| `DATA_DIR` | writable directory for the SQLite file and uploads |
| `SESSION_TTL_DAYS` | optional, default `7` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | optional one-time bootstrap |

The app needs **no external service** to run. No paid tier is required.

## AppJet deployment (current live environment)

1. Source lives on branch `appjet`; every change is committed and pushed automatically.
2. `deploy_app` builds the image from the repository `Dockerfile`, scans it, and rolls it out.
3. `wait_for_app_ready` confirms the rollout; the app is then reachable at its URL.
4. Health endpoints for probes: `/api/health` (liveness) and `/api/health/ready` (DB readiness).

Current deployment: **https://vp65bk5xmp.dev.ap-jt.com**

## Docker

```bash
docker build -t ibsam-portfolio .
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PUBLIC_URL=https://your-host \
  -v ibsam-data:/app/data \
  ibsam-portfolio
```

The image is multi-stage Alpine, installs production dependencies only, runs as a non-root
user and keeps OS packages current. Mount `DATA_DIR` to persist the database and uploads.

## First run

On a fresh deployment, open `/admin`. While no administrator exists the first-run setup
screen creates one (bcrypt-hashed, minimum 10 characters). Alternatively set
`ADMIN_EMAIL`/`ADMIN_PASSWORD` before the first boot or run `npm run seed:admin`.

Seed content (projects, skills, experience, settings) is inserted once, only when a table is
empty, so restarts never duplicate or overwrite real content.

## Backups

The whole state is two paths: the SQLite file (`$DATA_DIR/ibsam.db`) and `$DATA_DIR/uploads`.

```bash
# consistent copy while the app is running
sqlite3 data/ibsam.db ".backup '/backups/ibsam-$(date +%F).db'"
tar -czf "/backups/uploads-$(date +%F).tar.gz" data/uploads
```

Restore by stopping the app, replacing both paths, and restarting — migrations run
automatically on boot and are additive.

## Operations checklist

- [ ] `NODE_ENV=production` and `PUBLIC_URL` set to the real origin
- [ ] Administrator created; password stored in a password manager
- [ ] `/api/health` returns `200` with `data.status = "ok"`
- [ ] `/api/docs` reachable (restrict it at the edge if you do not want it public)
- [ ] Backups scheduled for the database file and uploads
- [ ] `npm test`, `npm run typecheck` and `npm run build` green before each release
- [ ] Dependency scan re-run after dependency changes

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Blank page, assets 500 in the console | An `Origin`-header rejection is being thrown; CORS must reject by omitting headers (fixed, guarded by `cors hardening` tests) |
| 502 after deploy | Server not listening on `0.0.0.0:$PORT`, or `npm start` missing |
| `/admin` shows the setup screen unexpectedly | No administrator row exists in this database — create one |
| Contact form saves but no realtime toast | The admin socket is not authenticated; sign in again |
| 401 on public API | A protected path was called; public endpoints are under `/api/site`, `/api/projects`, … |
