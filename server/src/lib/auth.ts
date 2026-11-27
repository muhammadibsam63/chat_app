import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db';
import { config } from '../config';
import { HttpError } from './http';

export const SESSION_COOKIE = 'ibsam_session';
export const CSRF_COOKIE = 'ibsam_csrf';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  avatarUrl: string | null;
  permissions: string[];
}

export interface SessionRecord {
  sessionId: string;
  user: AuthUser;
  expiresAt: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    sessionId?: string;
  }
}

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  role_label: string;
  avatar_url: string | null;
  is_active: number;
}

function permissionsForRole(role: string): string[] {
  const rows = db
    .prepare(
      `SELECT p.key FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN roles r ON r.id = rp.role_id
       WHERE r.name = ?`,
    )
    .all(role) as Array<{ key: string }>;
  return rows.map((row) => row.key);
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    roleLabel: row.role_label,
    avatarUrl: row.avatar_url,
    permissions: permissionsForRole(row.role),
  };
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.is_active, r.name AS role, r.label AS role_label
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.email = ? COLLATE NOCASE`,
    )
    .get(email.trim().toLowerCase()) as UserRow | undefined;
}

export function userCount(): number {
  return (db.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number }).total;
}

export function createUser(input: {
  email: string;
  password: string;
  name: string;
  role?: string;
  roleId?: number;
}): AuthUser {
  const roleName = input.role ?? 'ADMIN';
  const role = db.prepare('SELECT id FROM roles WHERE name = ?').get(roleName) as { id: number } | undefined;
  if (!role) throw new HttpError(500, 'Role configuration is missing');
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.email.trim().toLowerCase(), bcrypt.hashSync(input.password, BCRYPT_ROUNDS), input.name.trim(), role.id);
  const row = findUserByEmail(input.email);
  if (!row) throw new HttpError(500, 'User creation failed');
  return toAuthUser(row);
}

export function setSessionCookie(res: Response, token: string, csrfToken: string): void {
  const maxAge = config.sessionTtlDays * 24 * 60 * 60 * 1000;
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

export function createSession(userId: string, req: Request, res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent, ip, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    crypto.randomUUID(),
    userId,
    sha256(token),
    String(req.headers['user-agent'] ?? '').slice(0, 300),
    String(req.ip ?? '').slice(0, 64),
    expires.toISOString(),
  );
  setSessionCookie(res, token, csrfToken);
  db.prepare(`UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(userId);
  return token;
}

export function resolveSessionToken(token: string | undefined): SessionRecord | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.name, u.avatar_url, u.is_active,
              r.name AS role, r.label AS role_label
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL`,
    )
    .get(sha256(token)) as (UserRow & { session_id: string; expires_at: string }) | undefined;

  if (!row || !row.is_active) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
    return null;
  }
  return { sessionId: row.session_id, user: toAuthUser(row), expiresAt: row.expires_at };
}

export function revokeSessionById(sessionId: string): void {
  db.prepare(`UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?`).run(sessionId);
}

export function revokeAllSessions(userId: string, exceptSessionId?: string): void {
  if (exceptSessionId) {
    db.prepare(
      `UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND id <> ? AND revoked_at IS NULL`,
    ).run(userId, exceptSessionId);
  } else {
    db.prepare(`UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`).run(userId);
  }
}

/** Attaches the session user (if any) to the request without rejecting. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? undefined;
  const session = resolveSessionToken(token);
  if (session) {
    req.user = session.user;
    req.sessionId = session.sessionId;
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  next();
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }
    if (!req.user.permissions.includes(permission)) {
      next(new HttpError(403, 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

/**
 * CSRF defence: state-changing admin requests must echo the readable CSRF
 * cookie in the X-CSRF-Token header (double-submit pattern). Combined with
 * SameSite=Lax cookies this blocks cross-site form posting.
 */
export function csrfProtect(req: Request, _res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const cookieToken = (req.cookies?.[CSRF_COOKIE] as string | undefined) ?? '';
  const headerToken = String(req.headers['x-csrf-token'] ?? '');
  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    next(new HttpError(403, 'Invalid or missing CSRF token'));
    return;
  }
  next();
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleLabel: user.roleLabel,
    avatarUrl: user.avatarUrl,
    permissions: user.permissions,
  };
}
