import crypto from 'node:crypto';
import fs from 'node:fs';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { db, count, normaliseRow, setting } from '../db';
import { HttpError, asyncHandler, escapeLike, fail, ok, pagingMeta, parsePagination } from '../lib/http';
import { csrfProtect, hashPassword, publicUser, requireAuth } from '../lib/auth';
import { createNotification, logActivity } from '../lib/audit';
import { emitToAdmins, presenceSnapshot } from '../lib/realtime';
import { RESOURCES, getResource, validatePayload, type ResourceDef } from '../resources';

export const adminRouter = Router();

adminRouter.use(requireAuth, csrfProtect);

function assertPermission(req: Request, permission: string): void {
  if (!req.user?.permissions.includes(permission)) {
    throw new HttpError(403, `Missing permission: ${permission}`);
  }
}

function tableColumns(table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((row) => row.name);
}

function eventPrefix(resource: ResourceDef): string {
  return resource.table.replace(/s$/, '');
}

function requireResource(name: string): ResourceDef {
  const resource = getResource(name);
  if (!resource) throw new HttpError(404, `Unknown resource: ${name}`);
  return resource;
}

/* ── Overview ──────────────────────────────────────────────────── */

adminRouter.get(
  '/overview',
  asyncHandler((req, res) => {
    assertPermission(req, 'dashboard:read');
    const messages = db
      .prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 5')
      .all();
    const activity = db
      .prepare(
        `SELECT a.*, u.name AS user_name FROM activity_logs a
         LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 8`,
      )
      .all();
    const viewsByDay = db
      .prepare(
        `SELECT date(created_at) AS day, COUNT(*) AS total FROM page_views
         WHERE created_at >= date('now', '-13 days') GROUP BY day ORDER BY day`,
      )
      .all();

    return ok(res, {
      counts: {
        projects: count('projects'),
        publishedProjects: count('projects', 'published = 1'),
        skills: count('skills'),
        messages: count('contact_messages'),
        unreadMessages: count('contact_messages', "status = 'new'"),
        posts: count('blog_posts'),
        publishedPosts: count('blog_posts', 'published = 1'),
        testimonials: count('testimonials'),
        media: count('media_assets'),
        sessions: count('sessions', "expires_at > datetime('now')"),
      },
      messages,
      activity,
      notifications: db
        .prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10')
        .all(),
      unreadNotifications: count('notifications', 'read = 0'),
      viewsByDay,
      presence: presenceSnapshot(),
      system: {
        environment: config.env,
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        databaseSizeBytes: fs.existsSync(config.dbFile) ? fs.statSync(config.dbFile).size : 0,
        storage: storageUsage(),
      },
    });
  }),
);

function storageUsage() {
  const row = db.prepare('SELECT COALESCE(SUM(size),0) AS bytes, COUNT(*) AS files FROM media_assets').get() as {
    bytes: number;
    files: number;
  };
  return { usedBytes: row.bytes, files: row.files, limitBytes: config.maxUploadBytes * 200 };
}

/* ── Notifications & activity ──────────────────────────────────── */

adminRouter.get(
  '/notifications',
  asyncHandler((req, res) => {
    const unreadOnly = String(req.query.unread ?? '') === 'true';
    const rows = db
      .prepare(
        `SELECT * FROM notifications ${unreadOnly ? 'WHERE read = 0' : ''} ORDER BY created_at DESC LIMIT 50`,
      )
      .all() as Record<string, unknown>[];
    return ok(
      res,
      rows.map((row) => normaliseRow(row, [], ['read'])),
      { unread: count('notifications', 'read = 0') },
    );
  }),
);

adminRouter.post(
  '/notifications/:id/read',
  asyncHandler((req, res) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(String(req.params.id));
    return ok(res, { id: String(req.params.id), read: true });
  }),
);

adminRouter.post(
  '/notifications/read-all',
  asyncHandler((_req, res) => {
    const result = db.prepare('UPDATE notifications SET read = 1 WHERE read = 0').run();
    return ok(res, { updated: result.changes });
  }),
);

adminRouter.get(
  '/activity',
  asyncHandler((req, res) => {
    assertPermission(req, 'analytics:read');
    const { page, limit, offset } = parsePagination(req, { page: 1, limit: 30, maxLimit: 100 });
    const total = count('activity_logs');
    const rows = db
      .prepare(
        `SELECT a.*, u.name AS user_name, u.email AS user_email FROM activity_logs a
         LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(limit, offset);
    return ok(res, rows, pagingMeta(page, limit, total));
  }),
);

/* ── Analytics ─────────────────────────────────────────────────── */

adminRouter.get(
  '/analytics',
  asyncHandler((req, res) => {
    assertPermission(req, 'analytics:read');
    const days = Math.min(Math.max(Number(req.query.days ?? 14) || 14, 1), 90);
    const views = db
      .prepare(
        `SELECT date(created_at) AS day, COUNT(*) AS total FROM page_views
         WHERE created_at >= date('now', ?) GROUP BY day ORDER BY day`,
      )
      .all(`-${days - 1} days`);
    const topPaths = db
      .prepare(
        `SELECT path, COUNT(*) AS total FROM page_views
         WHERE created_at >= date('now', ?) GROUP BY path ORDER BY total DESC LIMIT 10`,
      )
      .all(`-${days - 1} days`);
    const messages = db
      .prepare(
        `SELECT date(created_at) AS day, COUNT(*) AS total FROM contact_messages
         WHERE created_at >= date('now', ?) GROUP BY day ORDER BY day`,
      )
      .all(`-${days - 1} days`);
    return ok(res, {
      days,
      views,
      topPaths,
      messages,
      totals: {
        views: count('page_views'),
        viewsWindow: (views as Array<{ total: number }>).reduce((sum, row) => sum + row.total, 0),
        messages: count('contact_messages'),
        sessions: count('sessions', "expires_at > datetime('now')"),
      },
    });
  }),
);

/* ── Users & roles ─────────────────────────────────────────────── */

adminRouter.get(
  '/roles',
  asyncHandler((req, res) => {
    assertPermission(req, 'dashboard:read');
    const roles = db.prepare('SELECT * FROM roles ORDER BY name').all() as Array<{ id: string; name: string }>;
    const permissions = db
      .prepare(
        `SELECT rp.role_id, p.key, p.description FROM role_permissions rp
         JOIN permissions p ON p.key = rp.permission_key ORDER BY p.key`,
      )
      .all() as Array<{ role_id: string; key: string; description: string }>;
    return ok(
      res,
      roles.map((role) => ({
        ...role,
        permissions: permissions.filter((item) => item.role_id === role.id).map((item) => item.key),
      })),
    );
  }),
);

adminRouter.get(
  '/users',
  asyncHandler((req, res) => {
    assertPermission(req, 'dashboard:read');
    const rows = db
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.is_active, u.last_login_at, u.created_at,
                r.label AS role_label
         FROM users u LEFT JOIN roles r ON r.name = u.role ORDER BY u.created_at ASC`,
      )
      .all() as Array<Record<string, unknown>>;
    return ok(
      res,
      rows.map((row) => ({ ...row, is_active: Boolean(row.is_active) })),
    );
  }),
);

adminRouter.post(
  '/users',
  asyncHandler(async (req, res) => {
    assertPermission(req, 'settings:write');
    const parsed = z
      .object({
        email: z.string().trim().toLowerCase().email(),
        name: z.string().trim().min(2).max(80),
        password: z.string().min(10).max(200),
        role: z.enum(['admin', 'editor', 'viewer']),
      })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Invalid user payload', parsed.error.issues);
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(parsed.data.email);
    if (exists) return fail(res, 409, 'A user with that email already exists');
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    ).run(id, parsed.data.email, parsed.data.name, await hashPassword(parsed.data.password), parsed.data.role);
    logActivity({ req, action: 'user.created', entity: 'user', entityId: id, meta: { role: parsed.data.role } });
    return ok(
      res,
      { id, email: parsed.data.email, name: parsed.data.name, role: parsed.data.role },
      undefined,
      201,
    );
  }),
);

adminRouter.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    assertPermission(req, 'settings:write');
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        role: z.enum(['admin', 'editor', 'viewer']).optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(10).max(200).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Invalid user payload', parsed.error.issues);
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(String(req.params.id)) as
      | { id: string; role: string }
      | undefined;
    if (!target) return fail(res, 404, 'User not found');
    if (target.id === req.user!.id && parsed.data.role && parsed.data.role !== 'admin') {
      return fail(res, 422, 'You cannot remove your own administrator role');
    }
    const updates: string[] = [];
    const params: unknown[] = [];
    if (parsed.data.name) {
      updates.push('name = ?');
      params.push(parsed.data.name);
    }
    if (parsed.data.role) {
      updates.push('role = ?');
      params.push(parsed.data.role);
    }
    if (parsed.data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(parsed.data.isActive ? 1 : 0);
    }
    if (parsed.data.password) {
      updates.push('password_hash = ?');
      params.push(await hashPassword(parsed.data.password));
    }
    if (updates.length === 0) return fail(res, 422, 'Nothing to update');
    updates.push("updated_at = datetime('now')");
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params, target.id);
    if (parsed.data.isActive === false || parsed.data.password) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id);
    }
    logActivity({ req, action: 'user.updated', entity: 'user', entityId: target.id });
    return ok(res, { updated: true });
  }),
);

adminRouter.delete(
  '/users/:id',
  asyncHandler((req, res) => {
    assertPermission(req, 'settings:write');
    if (String(req.params.id) === req.user!.id) return fail(res, 422, 'You cannot delete your own account');
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(String(req.params.id));
    if (result.changes === 0) return fail(res, 404, 'User not found');
    logActivity({ req, action: 'user.deleted', entity: 'user', entityId: String(req.params.id) });
    return ok(res, { deleted: true });
  }),
);

/* ── Generic content CRUD ──────────────────────────────────────── */

function listPermission(resource: ResourceDef): string {
  if (resource.table === 'contact_messages') return 'messages:read';
  return resource.permission;
}

adminRouter.get(
  '/content/:resource',
  asyncHandler((req, res) => {
    const resource = requireResource(String(req.params.resource));
    assertPermission(req, listPermission(resource));

    const { page, limit, offset } = parsePagination(req, { page: 1, limit: 25, maxLimit: 200 });
    const columns = tableColumns(resource.table);
    const where: string[] = ['1=1'];
    const params: unknown[] = [];

    const q = String(req.query.q ?? '').trim();
    if (q && resource.searchable.length > 0) {
      const clauses = resource.searchable
        .filter((field) => columns.includes(field))
        .map((field) => `${field} LIKE ? ESCAPE "\\"`);
      if (clauses.length) {
        where.push(`(${clauses.join(' OR ')})`);
        for (let i = 0; i < clauses.length; i += 1) params.push(`%${escapeLike(q)}%`);
      }
    }
    for (const key of ['status', 'category', 'role', 'published', 'featured']) {
      const value = req.query[key];
      if (value !== undefined && value !== '' && columns.includes(key)) {
        where.push(`${key} = ?`);
        params.push(key === 'published' || key === 'featured' ? (String(value) === 'true' ? 1 : 0) : String(value));
      }
    }

    const clause = where.join(' AND ');
    const total = (
      db.prepare(`SELECT COUNT(*) AS total FROM ${resource.table} WHERE ${clause}`).get(...params) as { total: number }
    ).total;
    const rows = db
      .prepare(`SELECT * FROM ${resource.table} WHERE ${clause} ORDER BY ${resource.defaultSort} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Record<string, unknown>[];

    return ok(
      res,
      rows.map((row) => normaliseRow(row, resource.jsonFields ?? [], resource.boolFields ?? [])),
      { ...pagingMeta(page, limit, total), fields: resource.fields, label: resource.label },
    );
  }),
);

adminRouter.get(
  '/content/:resource/:id',
  asyncHandler((req, res) => {
    const resource = requireResource(String(req.params.resource));
    assertPermission(req, listPermission(resource));
    const row = db.prepare(`SELECT * FROM ${resource.table} WHERE id = ?`).get(String(req.params.id)) as
      | Record<string, unknown>
      | undefined;
    if (!row) return fail(res, 404, `${resource.singular} not found`);
    return ok(res, normaliseRow(row, resource.jsonFields ?? [], resource.boolFields ?? []), {
      fields: resource.fields,
    });
  }),
);

adminRouter.post(
  '/content/:resource',
  asyncHandler((req, res) => {
    const resource = requireResource(String(req.params.resource));
    assertPermission(req, resource.permission);

    const { values, errors } = validatePayload(resource, req.body ?? {}, { partial: false });
    if (errors.length > 0) return fail(res, 422, errors[0], errors);

    const id = crypto.randomUUID();
    const columns = tableColumns(resource.table);
    const payload: Record<string, unknown> = { id, ...values };
    if (resource.slugFrom && columns.includes('slug')) {
      payload.slug = uniqueSlug(resource, String(payload.slug ?? ''));
    }
    const keys = Object.keys(payload).filter((key) => columns.includes(key));
    const sql = `INSERT INTO ${resource.table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    try {
      db.prepare(sql).run(...keys.map((key) => payload[key] as never));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Insert failed';
      if (message.includes('UNIQUE')) return fail(res, 409, 'A record with that slug or key already exists');
      throw error;
    }
    const row = db.prepare(`SELECT * FROM ${resource.table} WHERE id = ?`).get(id) as Record<string, unknown>;
    logActivity({ req, action: `${resource.table}.created`, entity: resource.table, entityId: id });
    emitToAdmins(`${eventPrefix(resource)}:created`, normaliseRow(row, resource.jsonFields ?? [], resource.boolFields ?? []));
    if (resource.table === 'contact_messages') {
      emitToAdmins('contact:new', row);
    }
    return ok(res, normaliseRow(row, resource.jsonFields ?? [], resource.boolFields ?? []), undefined, 201);
  }),
);

adminRouter.patch(
  '/content/:resource/:id',
  asyncHandler((req, res) => {
    const resource = requireResource(String(req.params.resource));
    assertPermission(req, resource.permission);

    const existing = db.prepare(`SELECT * FROM ${resource.table} WHERE id = ?`).get(String(req.params.id)) as
      | Record<string, unknown>
      | undefined;
    if (!existing) return fail(res, 404, `${resource.singular} not found`);

    const { values, errors } = validatePayload(resource, req.body ?? {}, { partial: true });
    if (errors.length > 0) return fail(res, 422, errors[0], errors);

    const columns = tableColumns(resource.table);
    const payload: Record<string, unknown> = { ...values };
    if (resource.slugFrom && payload.slug !== undefined && columns.includes('slug')) {
      payload.slug = uniqueSlug(resource, String(payload.slug), String(existing.id));
    }
    const keys = Object.keys(payload).filter((key) => columns.includes(key));
    if (keys.length === 0) return fail(res, 422, 'Nothing to update');

    const assignments = keys.map((key) => `${key} = ?`);
    const params = keys.map((key) => payload[key] as never);
    if (columns.includes('updated_at')) assignments.push("updated_at = datetime('now')");
    try {
      db.prepare(`UPDATE ${resource.table} SET ${assignments.join(', ')} WHERE id = ?`).run(...params, String(existing.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      if (message.includes('UNIQUE')) return fail(res, 409, 'A record with that slug or key already exists');
      throw error;
    }

    const row = db.prepare(`SELECT * FROM ${resource.table} WHERE id = ?`).get(String(existing.id)) as Record<
      string,
      unknown
    >;
    logActivity({ req, action: `${resource.table}.updated`, entity: resource.table, entityId: String(existing.id) });
    emitToAdmins(
      `${eventPrefix(resource)}:updated`,
      normaliseRow(row, resource.jsonFields ?? [], resource.boolFields ?? []),
    );
    if (resource.table === 'contact_messages') {
      emitToAdmins('contact:updated', row);
      if (existing.status !== row.status && row.status === 'read') {
        createNotification({
          type: 'message',
          title: 'Message marked as read',
          body: String(row.subject ?? ''),
          link: '/admin/messages',
        });
      }
    }
    return ok(res, normaliseRow(row, resource.jsonFields ?? [], resource.boolFields ?? []));
  }),
);

adminRouter.delete(
  '/content/:resource/:id',
  asyncHandler((req, res) => {
    const resource = requireResource(String(req.params.resource));
    assertPermission(req, resource.permission);
    const result = db.prepare(`DELETE FROM ${resource.table} WHERE id = ?`).run(String(req.params.id));
    if (result.changes === 0) return fail(res, 404, `${resource.singular} not found`);
    logActivity({ req, action: `${resource.table}.deleted`, entity: resource.table, entityId: String(req.params.id) });
    emitToAdmins(`${eventPrefix(resource)}:deleted`, { id: String(req.params.id) });
    return ok(res, { deleted: true });
  }),
);

function uniqueSlug(resource: ResourceDef, base: string, excludeId?: string): string {
  const root = base || crypto.randomBytes(4).toString('hex');
  let candidate = root;
  let attempt = 1;
  const statement = db.prepare(
    `SELECT id FROM ${resource.table} WHERE slug = ? ${excludeId ? 'AND id <> ?' : ''} LIMIT 1`,
  );
  while (statement.get(...(excludeId ? [candidate, excludeId] : [candidate]))) {
    attempt += 1;
    candidate = `${root}-${attempt}`;
  }
  return candidate;
}

/* ── Current user profile ──────────────────────────────────────── */

adminRouter.get('/me', (req, res) => ok(res, publicUser(req.user!)));

adminRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({ name: z.string().trim().min(2).max(80).optional(), avatarUrl: z.string().max(500).nullable().optional() })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Invalid profile payload', parsed.error.issues);
    const updates: string[] = [];
    const params: unknown[] = [];
    if (parsed.data.name) {
      updates.push('name = ?');
      params.push(parsed.data.name);
    }
    if (parsed.data.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      params.push(parsed.data.avatarUrl);
    }
    if (!updates.length) return fail(res, 422, 'Nothing to update');
    db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(
      ...params,
      req.user!.id,
    );
    logActivity({ req, action: 'profile.updated', entity: 'user', entityId: req.user!.id });
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>;
    return ok(res, { name: updated.name, avatarUrl: updated.avatar_url });
  }),
);

adminRouter.get('/presence', (req, res) => {
  assertPermission(req, 'dashboard:read');
  return ok(res, presenceSnapshot());
});

adminRouter.get('/system', (req, res) => {
  assertPermission(req, 'dashboard:read');
  const settingsRow = setting('profile');
  return ok(res, {
    environment: config.env,
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    databaseSizeBytes: fs.existsSync(config.dbFile) ? fs.statSync(config.dbFile).size : 0,
    storage: storageUsage(),
    settingsKeys: settingsRow ? Object.keys(JSON.parse(settingsRow)) : [],
    resources: Object.keys(RESOURCES),
  });
});
