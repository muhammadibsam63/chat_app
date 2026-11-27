import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db, normaliseRow, setting } from '../db';
import { asyncHandler, clientIp, escapeLike, fail, ok, pagingMeta, parsePagination } from '../lib/http';
import { createNotification, logActivity } from '../lib/audit';
import { sendContactNotification } from '../lib/mailer';
import { emitToAdmins } from '../lib/realtime';
import { config } from '../config';

export const publicRouter = Router();

const PROJECT_JSON = ['technologies', 'gallery'];
const PROJECT_BOOL = ['featured', 'published'];
const POST_JSON = ['tags'];
const POST_BOOL = ['published'];
const SERVICE_JSON = ['features'];
const SERVICE_BOOL = ['published'];
const SKILL_BOOL = ['featured'];
const EXPERIENCE_JSON = ['technologies'];
const EXPERIENCE_BOOL = ['is_current'];
const CASE_JSON = ['metrics'];
const CASE_BOOL = ['published'];
const TESTIMONIAL_BOOL = ['published'];

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many messages from this address. Please try again later.', status: 429 } },
});

const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests', status: 429 } },
});

function settingsPayload() {
  const keys = ['profile', 'socials', 'seo', 'contact', 'footer'];
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = setting(key);
    result[key] = raw ? JSON.parse(raw) : null;
  }
  return result;
}

publicRouter.get('/site', (_req, res) => ok(res, settingsPayload()));

publicRouter.get('/stats', (_req, res) => {
  const one = (sql: string, params: unknown[] = []) =>
    ((db.prepare(sql).get(...params) as { total: number } | undefined)?.total ?? 0);
  ok(res, {
    projects: one('SELECT COUNT(*) AS total FROM projects WHERE published = 1'),
    caseStudies: one('SELECT COUNT(*) AS total FROM case_studies WHERE published = 1'),
    skills: one('SELECT COUNT(*) AS total FROM skills'),
    posts: one('SELECT COUNT(*) AS total FROM blog_posts WHERE published = 1'),
    services: one('SELECT COUNT(*) AS total FROM services WHERE published = 1'),
    testimonials: one('SELECT COUNT(*) AS total FROM testimonials WHERE published = 1'),
  });
});

publicRouter.get(
  '/projects',
  asyncHandler((req, res) => {
    const { page, limit, offset } = parsePagination(req, { page: 1, limit: 12, maxLimit: 60 });
    const q = String(req.query.q ?? '').trim();
    const category = String(req.query.category ?? '').trim();
    const featured = String(req.query.featured ?? '').trim();
    const sort = String(req.query.sort ?? 'order');

    const where: string[] = ['published = 1'];
    const params: unknown[] = [];
    if (q) {
      where.push('(title LIKE ? ESCAPE "\\" OR summary LIKE ? ESCAPE "\\" OR technologies LIKE ? ESCAPE "\\")');
      const like = `%${escapeLike(q)}%`;
      params.push(like, like, like);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (featured === 'true') where.push('featured = 1');

    const orderBy =
      sort === 'recent'
        ? 'created_at DESC'
        : sort === 'title'
          ? 'title ASC'
          : 'sort_order ASC, created_at DESC';

    const clause = where.join(' AND ');
    const total = (
      db.prepare(`SELECT COUNT(*) AS total FROM projects WHERE ${clause}`).get(...params) as { total: number }
    ).total;
    const rows = db
      .prepare(`SELECT * FROM projects WHERE ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Record<string, unknown>[];

    const categories = (
      db.prepare('SELECT DISTINCT category FROM projects WHERE published = 1 ORDER BY category').all() as Array<{
        category: string;
      }>
    ).map((row) => row.category);

    ok(
      res,
      rows.map((row) => normaliseRow(row, PROJECT_JSON, PROJECT_BOOL)),
      { ...pagingMeta(page, limit, total), categories },
    );
  }),
);

publicRouter.get(
  '/projects/:slug',
  asyncHandler((req, res) => {
    const row = db.prepare('SELECT * FROM projects WHERE slug = ? AND published = 1').get(req.params.slug) as
      | Record<string, unknown>
      | undefined;
    if (!row) return fail(res, 404, 'Project not found');
    const project = normaliseRow(row, PROJECT_JSON, PROJECT_BOOL);
    const caseStudy = db
      .prepare('SELECT * FROM case_studies WHERE project_slug = ? AND published = 1 LIMIT 1')
      .get(String(row.slug)) as Record<string, unknown> | undefined;
    const related = db
      .prepare(
        `SELECT * FROM projects WHERE published = 1 AND slug <> ? AND category = ?
         ORDER BY sort_order ASC LIMIT 3`,
      )
      .all(String(row.slug), String(row.category)) as Record<string, unknown>[];
    return ok(res, {
      project,
      caseStudy: caseStudy ? normaliseRow(caseStudy, CASE_JSON, CASE_BOOL) : null,
      related: related.map((item) => normaliseRow(item, PROJECT_JSON, PROJECT_BOOL)),
    });
  }),
);

publicRouter.get(
  '/case-studies',
  asyncHandler((_req, res) => {
    const rows = db
      .prepare('SELECT * FROM case_studies WHERE published = 1 ORDER BY sort_order ASC, created_at DESC')
      .all() as Record<string, unknown>[];
    return ok(res, rows.map((row) => normaliseRow(row, CASE_JSON, CASE_BOOL)));
  }),
);

publicRouter.get(
  '/case-studies/:slug',
  asyncHandler((req, res) => {
    const row = db.prepare('SELECT * FROM case_studies WHERE slug = ? AND published = 1').get(req.params.slug) as
      | Record<string, unknown>
      | undefined;
    if (!row) return fail(res, 404, 'Case study not found');
    return ok(res, normaliseRow(row, CASE_JSON, CASE_BOOL));
  }),
);

publicRouter.get('/skills', (_req, res) => {
  const rows = db.prepare('SELECT * FROM skills ORDER BY sort_order ASC, name ASC').all() as Record<string, unknown>[];
  const skills = rows.map((row) => normaliseRow(row, [], SKILL_BOOL));
  const categories = Array.from(new Set(rows.map((row) => String(row.category))));
  return ok(res, skills, { categories });
});

publicRouter.get('/experience', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM experience ORDER BY sort_order ASC, start_date DESC')
    .all() as Record<string, unknown>[];
  return ok(res, rows.map((row) => normaliseRow(row, EXPERIENCE_JSON, EXPERIENCE_BOOL)));
});

publicRouter.get('/education', (_req, res) => {
  const rows = db.prepare('SELECT * FROM education ORDER BY sort_order ASC, start_date DESC').all();
  return ok(res, rows);
});

publicRouter.get('/certifications', (_req, res) => {
  const rows = db.prepare('SELECT * FROM certifications ORDER BY sort_order ASC, issued_at DESC').all();
  return ok(res, rows);
});

publicRouter.get('/achievements', (_req, res) => {
  const rows = db.prepare('SELECT * FROM achievements ORDER BY sort_order ASC, achieved_at DESC').all();
  return ok(res, rows);
});

publicRouter.get('/services', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM services WHERE published = 1 ORDER BY sort_order ASC')
    .all() as Record<string, unknown>[];
  return ok(res, rows.map((row) => normaliseRow(row, SERVICE_JSON, SERVICE_BOOL)));
});

publicRouter.get('/testimonials', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM testimonials WHERE published = 1 ORDER BY sort_order ASC, created_at DESC')
    .all() as Record<string, unknown>[];
  return ok(res, rows.map((row) => normaliseRow(row, [], TESTIMONIAL_BOOL)));
});

publicRouter.get(
  '/blog',
  asyncHandler((req, res) => {
    const { page, limit, offset } = parsePagination(req, { page: 1, limit: 9, maxLimit: 40 });
    const q = String(req.query.q ?? '').trim();
    const category = String(req.query.category ?? '').trim();
    const where = ['published = 1'];
    const params: unknown[] = [];
    if (q) {
      where.push('(title LIKE ? ESCAPE "\\" OR excerpt LIKE ? ESCAPE "\\" OR tags LIKE ? ESCAPE "\\")');
      const like = `%${escapeLike(q)}%`;
      params.push(like, like, like);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    const clause = where.join(' AND ');
    const total = (
      db.prepare(`SELECT COUNT(*) AS total FROM blog_posts WHERE ${clause}`).get(...params) as { total: number }
    ).total;
    const rows = db
      .prepare(
        `SELECT id, slug, title, excerpt, cover_image, category, tags, published_at, read_minutes, views, created_at
         FROM blog_posts WHERE ${clause} ORDER BY published_at DESC, created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset) as Record<string, unknown>[];
    const categories = (
      db.prepare('SELECT DISTINCT category FROM blog_posts WHERE published = 1').all() as Array<{ category: string }>
    ).map((row) => row.category);
    return ok(
      res,
      rows.map((row) => normaliseRow(row, POST_JSON, POST_BOOL)),
      { ...pagingMeta(page, limit, total), categories },
    );
  }),
);

publicRouter.get(
  '/blog/:slug',
  asyncHandler((req, res) => {
    const row = db.prepare('SELECT * FROM blog_posts WHERE slug = ? AND published = 1').get(req.params.slug) as
      | Record<string, unknown>
      | undefined;
    if (!row) return fail(res, 404, 'Post not found');
    db.prepare('UPDATE blog_posts SET views = views + 1 WHERE id = ?').run(String(row.id));
    const related = db
      .prepare(
        `SELECT slug, title, excerpt, published_at, read_minutes FROM blog_posts
         WHERE published = 1 AND slug <> ? ORDER BY published_at DESC LIMIT 3`,
      )
      .all(String(row.slug));
    return ok(res, {
      post: normaliseRow(row, POST_JSON, POST_BOOL),
      related,
    });
  }),
);

publicRouter.get('/resume', (_req, res) => {
  const row = db
    .prepare('SELECT id, original_name, url, size, mime_type, created_at FROM resumes WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1')
    .get();
  return ok(res, row ?? null);
});

publicRouter.post(
  '/contact',
  contactLimiter,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        name: z.string().trim().min(2, 'Please share your name').max(80),
        email: z.string().trim().email('A valid email is required').max(200),
        subject: z.string().trim().max(140).optional().or(z.literal('')),
        message: z.string().trim().min(20, 'Please write at least 20 characters').max(4000),
        company: z.string().max(200).optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return fail(res, 422, 'Please check the form and try again', parsed.error.flatten().fieldErrors);
    }
    // Honeypot: real users never fill a field named "company".
    if (parsed.data.company && parsed.data.company.trim() !== '') {
      return ok(res, { received: true }, undefined, 201);
    }

    const id = crypto.randomUUID();
    const subject = parsed.data.subject?.trim() || 'Portfolio enquiry';
    db.prepare(
      `INSERT INTO contact_messages (id, name, email, subject, message, status, email_status, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, 'new', 'pending', ?, ?)`,
    ).run(
      id,
      parsed.data.name,
      parsed.data.email,
      subject,
      parsed.data.message,
      clientIp(req),
      String(req.headers['user-agent'] ?? '').slice(0, 300),
    );

    const notification = createNotification({
      type: 'contact',
      title: `New message from ${parsed.data.name}`,
      body: subject,
      link: '/admin/messages',
    });

    const message = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
    emitToAdmins('contact:new', message);
    emitToAdmins('notification:new', {
      id: notification.id,
      type: 'contact',
      title: `New message from ${parsed.data.name}`,
      body: subject,
    });

    const emailStatus = await sendContactNotification({
      name: parsed.data.name,
      email: parsed.data.email,
      subject,
      message: parsed.data.message,
    });
    db.prepare('UPDATE contact_messages SET email_status = ? WHERE id = ?').run(emailStatus, id);

    logActivity({ req, action: 'contact.received', entity: 'contact_message', entityId: id });

    return ok(
      res,
      {
        received: true,
        id,
        emailStatus,
        message:
          emailStatus === 'sent'
            ? 'Message received. A notification has been sent.'
            : 'Message received and stored. I will reply as soon as I can.',
      },
      undefined,
      201,
    );
  }),
);

publicRouter.post(
  '/analytics/pageview',
  viewLimiter,
  asyncHandler((req, res) => {
    const parsed = z
      .object({
        path: z.string().max(300),
        referrer: z.string().max(400).optional(),
        sessionId: z.string().max(80).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Invalid pageview payload');
    db.prepare('INSERT INTO page_views (id, path, referrer, session_id, user_agent) VALUES (?, ?, ?, ?, ?)').run(
      crypto.randomUUID(),
      parsed.data.path,
      parsed.data.referrer ?? null,
      parsed.data.sessionId ?? null,
      String(req.headers['user-agent'] ?? '').slice(0, 200),
    );
    return ok(res, { recorded: true }, undefined, 201);
  }),
);

publicRouter.get('/health', (_req, res) => {
  ok(res, {
    status: 'ok',
    service: 'ibsam-portfolio-api',
    version: '1.0.0',
    environment: config.env,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

publicRouter.get(
  '/health/ready',
  asyncHandler((_req, res) => {
    const database = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    const tables = db
      .prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .get() as { total: number };
    return ok(res, {
      status: database.ok === 1 ? 'ready' : 'degraded',
      database: { reachable: database.ok === 1, tables: tables.total },
      timestamp: new Date().toISOString(),
    });
  }),
);
