import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config';
import { db } from '../db';
import { asyncHandler, fail, ok } from '../lib/http';
import { requireAuth, requirePermission } from '../lib/auth';
import { logActivity } from '../lib/audit';
import { emitToAdmins } from '../lib/realtime';

export const mediaRouter = Router();

function extensionFor(mime: string, original: string): string {
  const fromName = path.extname(original).toLowerCase();
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/svg+xml': '.svg',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };
  return map[mime] ?? (fromName.length <= 6 ? fromName : '.bin');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadsDir),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extensionFor(file.mimetype, file.originalname)}`);
  },
});

const allowedTypes = new Set([...config.allowedImageTypes, ...config.allowedDocumentTypes]);

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      cb(new Error('Unsupported file type. Allowed: PNG, JPEG, WEBP, AVIF, GIF, SVG, PDF, DOC, DOCX'));
      return;
    }
    cb(null, true);
  },
});

mediaRouter.use(requireAuth, requirePermission('media:write'));

mediaRouter.get(
  '/',
  asyncHandler((_req, res) => {
    const rows = db.prepare('SELECT * FROM media_assets ORDER BY created_at DESC LIMIT 200').all();
    const usage = db.prepare('SELECT COALESCE(SUM(size), 0) AS bytes, COUNT(*) AS files FROM media_assets').get() as {
      bytes: number;
      files: number;
    };
    return ok(res, rows, { usage });
  }),
);

mediaRouter.post(
  '/',
  upload.single('file'),
  asyncHandler((req, res) => {
    if (!req.file) return fail(res, 422, 'No file was uploaded');
    const kind = req.file.mimetype.startsWith('image/') ? 'image' : 'document';
    const id = crypto.randomUUID();
    const url = `/uploads/${req.file.filename}`;
    db.prepare(
      `INSERT INTO media_assets (id, filename, original_name, mime_type, size, url, kind, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, req.file.filename, req.file.originalname.slice(0, 200), req.file.mimetype, req.file.size, url, kind, req.user!.id);
    logActivity({ req, action: 'media.uploaded', entity: 'media_asset', entityId: id, meta: { kind, size: req.file.size } });
    const asset = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id);
    emitToAdmins('media:created', asset);
    return ok(res, asset, undefined, 201);
  }),
);

mediaRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const asset = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(req.params.id) as
      | { id: string; filename: string }
      | undefined;
    if (!asset) return fail(res, 404, 'Asset not found');
    const filePath = path.join(config.uploadsDir, path.basename(asset.filename));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM media_assets WHERE id = ?').run(asset.id);
    logActivity({ req, action: 'media.deleted', entity: 'media_asset', entityId: asset.id });
    emitToAdmins('media:deleted', { id: asset.id });
    return ok(res, { deleted: true });
  }),
);

/* ── Resume management ─────────────────────────────────────────── */

export const resumeRouter = Router();
resumeRouter.use(requireAuth, requirePermission('media:write'));

resumeRouter.post(
  '/',
  upload.single('file'),
  asyncHandler((req, res) => {
    if (!req.file) return fail(res, 422, 'No file was uploaded');
    if (!config.allowedDocumentTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return fail(res, 422, 'Resume must be a PDF or Word document');
    }
    const id = crypto.randomUUID();
    const url = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE resumes SET is_active = 0').run();
    db.prepare(
      `INSERT INTO resumes (id, filename, original_name, mime_type, size, url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    ).run(id, req.file.filename, req.file.originalname.slice(0, 200), req.file.mimetype, req.file.size, url);
    logActivity({ req, action: 'resume.uploaded', entity: 'resume', entityId: id });
    emitToAdmins('resume:updated', { id });
    return ok(res, db.prepare('SELECT * FROM resumes WHERE id = ?').get(id), undefined, 201);
  }),
);

resumeRouter.get(
  '/',
  asyncHandler((_req, res) => {
    return ok(res, db.prepare('SELECT * FROM resumes ORDER BY created_at DESC').all());
  }),
);

resumeRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(req.params.id) as
      | { id: string; filename: string }
      | undefined;
    if (!row) return fail(res, 404, 'Resume not found');
    const filePath = path.join(config.uploadsDir, path.basename(row.filename));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM resumes WHERE id = ?').run(row.id);
    logActivity({ req, action: 'resume.deleted', entity: 'resume', entityId: row.id });
    return ok(res, { deleted: true });
  }),
);

/* ── Settings ──────────────────────────────────────────────────── */

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const SETTING_KEYS = ['profile', 'socials', 'seo', 'contact', 'footer'] as const;

settingsRouter.get(
  '/',
  asyncHandler((_req, res) => {
    const rows = db.prepare('SELECT key, value FROM site_settings').all() as Array<{ key: string; value: string }>;
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return ok(res, result);
  }),
);

settingsRouter.put(
  '/',
  requirePermission('settings:write'),
  asyncHandler((req, res) => {
    const schema = z.record(z.string(), z.any());
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return fail(res, 422, 'Invalid settings payload', parsed.error.flatten().fieldErrors);

    const update = db.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    );
    const keys = Object.keys(parsed.data).filter((key) => (SETTING_KEYS as readonly string[]).includes(key));
    if (keys.length === 0) return fail(res, 422, 'No known settings keys supplied');
    const transaction = db.transaction(() => {
      for (const key of keys) update.run(key, JSON.stringify(parsed.data[key]));
    });
    transaction();
    logActivity({ req, action: 'settings.updated', entity: 'site_settings', meta: { keys } });
    emitToAdmins('settings:updated', { keys });
    return ok(res, { updated: keys });
  }),
);
