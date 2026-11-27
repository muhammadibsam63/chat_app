import crypto from 'node:crypto';
import { db } from '../db';
import { clientIp } from './http';
import type { Request } from 'express';

export function logActivity(input: {
  req?: Request;
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}): void {
  db.prepare(
    `INSERT INTO activity_logs (id, user_id, action, entity, entity_id, meta, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    crypto.randomUUID(),
    input.userId ?? input.req?.user?.id ?? null,
    input.action,
    input.entity ?? null,
    input.entityId ?? null,
    input.meta ? JSON.stringify(input.meta) : null,
    input.req ? clientIp(input.req) : null,
  );
}

export function createNotification(input: {
  type: string;
  title: string;
  body?: string;
  link?: string;
}): { id: string } {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO notifications (id, type, title, body, link) VALUES (?, ?, ?, ?, ?)').run(
    id,
    input.type,
    input.title,
    input.body ?? null,
    input.link ?? null,
  );
  return { id };
}
