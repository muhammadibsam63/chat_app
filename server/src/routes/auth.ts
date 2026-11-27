import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db';
import { config } from '../config';
import { asyncHandler, clientIp, fail, ok } from '../lib/http';
import {
  clearSessionCookies,
  createSession,
  createUser,
  findUserByEmail,
  hashPassword,
  publicUser,
  requireAuth,
  revokeAllSessions,
  revokeSessionById,
  userCount,
  verifyPassword,
} from '../lib/auth';
import { logActivity } from '../lib/audit';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many login attempts. Try again in 15 minutes.', status: 429 } },
});

const passwordPolicy = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password is too long');

const credentialsSchema = z.object({
  email: z.string().email('A valid email is required').max(200),
  password: z.string().min(1, 'Password is required').max(200),
});

authRouter.get('/setup-status', (_req, res) => {
  ok(res, {
    needsSetup: userCount() === 0,
    bootstrapFromEnv: Boolean(config.adminEmail && config.adminPassword),
  });
});

/** First-run setup: only reachable while the users table is empty. */
authRouter.post(
  '/bootstrap',
  loginLimiter,
  asyncHandler(async (req, res) => {
    if (userCount() > 0) return fail(res, 409, 'Setup has already been completed');
    const parsed = z
      .object({ name: z.string().min(2).max(120), email: z.string().email().max(200), password: passwordPolicy })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Validation failed', parsed.error.flatten().fieldErrors);

    const user = createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: 'ADMIN',
    });
    createSession(user.id, req, res);
    logActivity({ req, userId: user.id, action: 'auth.bootstrap', entity: 'user', entityId: user.id });
    return ok(res, { user: publicUser(user) }, undefined, 201);
  }),
);

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Validation failed', parsed.error.flatten().fieldErrors);

    const row = findUserByEmail(parsed.data.email);
    const genericFailure = () => fail(res, 401, 'Invalid email or password');

    if (!row || !row.is_active) {
      logActivity({ req, action: 'auth.login_failed', entity: 'user', meta: { email: parsed.data.email.slice(0, 80) } });
      return genericFailure();
    }

    const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(row.id) as { password_hash: string };
    const valid = await verifyPassword(parsed.data.password, stored.password_hash);
    if (!valid) {
      logActivity({ req, action: 'auth.login_failed', entity: 'user', entityId: row.id });
      return genericFailure();
    }

    createSession(row.id, req, res);
    logActivity({ req, userId: row.id, action: 'auth.login', entity: 'user', entityId: row.id, meta: { ip: clientIp(req) } });
    const user = findUserByEmail(row.email)!;
    return ok(res, { user: publicUser({ ...user, permissions: [] } as never) });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    if (req.sessionId) {
      revokeSessionById(req.sessionId);
      logActivity({ req, action: 'auth.logout', entity: 'session', entityId: req.sessionId });
    }
    clearSessionCookies(res);
    return ok(res, { loggedOut: true });
  }),
);

authRouter.get('/me', (req, res) => {
  if (!req.user) return ok(res, null);
  return ok(res, { user: publicUser(req.user) });
});

authRouter.post(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({ currentPassword: z.string().min(1), newPassword: passwordPolicy })
      .safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Validation failed', parsed.error.flatten().fieldErrors);

    const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as {
      password_hash: string;
    };
    if (!(await verifyPassword(parsed.data.currentPassword, stored.password_hash))) {
      return fail(res, 401, 'Current password is incorrect');
    }
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
      await hashPassword(parsed.data.newPassword),
      req.user!.id,
    );
    revokeAllSessions(req.user!.id, req.sessionId);
    logActivity({ req, action: 'auth.password_changed', entity: 'user', entityId: req.user!.id });
    return ok(res, { updated: true });
  }),
);

authRouter.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT id, user_agent, ip, created_at, expires_at FROM sessions
         WHERE user_id = ? AND revoked_at IS NULL AND expires_at > datetime('now')
         ORDER BY created_at DESC`,
      )
      .all(req.user!.id);
    return ok(res, rows, { current: req.sessionId });
  }),
);

authRouter.delete(
  '/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = db.prepare('SELECT id, user_id FROM sessions WHERE id = ?').get(req.params.id) as
      | { id: string; user_id: string }
      | undefined;
    if (!session || session.user_id !== req.user!.id) return fail(res, 404, 'Session not found');
    revokeSessionById(session.id);
    logActivity({ req, action: 'auth.session_revoked', entity: 'session', entityId: session.id });
    return ok(res, { revoked: true });
  }),
);

/** Password reset request. Always returns a generic response (no user enumeration). */
authRouter.post(
  '/forgot-password',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Validation failed', parsed.error.flatten().fieldErrors);

    const user = findUserByEmail(parsed.data.email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      db.prepare(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, datetime('now', '+30 minutes'))`,
      ).run(crypto.randomUUID(), user.id, tokenHash);
      logActivity({ req, action: 'auth.password_reset_requested', entity: 'user', entityId: user.id });
      // No email provider configured: the reset token is printed to the server
      // log so the operator can complete the flow. Never returned to the client.
      if (!config.resendApiKey) console.info(`[auth] password reset token for ${user.email}: ${token}`);
    }
    return ok(res, {
      requested: true,
      message: 'If that address exists, a reset link has been issued.',
    });
  }),
);

authRouter.post(
  '/reset-password',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = z.object({ token: z.string().min(20), newPassword: passwordPolicy }).safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Validation failed', parsed.error.flatten().fieldErrors);

    const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
    const reset = db
      .prepare(
        `SELECT id, user_id FROM password_resets
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`,
      )
      .get(tokenHash) as { id: string; user_id: string } | undefined;
    if (!reset) return fail(res, 400, 'This reset token is invalid or has expired');

    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
      await hashPassword(parsed.data.newPassword),
      reset.user_id,
    );
    db.prepare(`UPDATE password_resets SET used_at = datetime('now') WHERE id = ?`).run(reset.id);
    revokeAllSessions(reset.user_id);
    logActivity({ req, action: 'auth.password_reset_completed', entity: 'user', entityId: reset.user_id });
    return ok(res, { reset: true });
  }),
);
