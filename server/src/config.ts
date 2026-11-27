import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const env = process.env.NODE_ENV ?? 'development';
const dataDir = path.resolve(process.env.DATA_DIR ?? './data');
const uploadsDir = path.join(dataDir, 'uploads');
const dbFile = path.resolve(process.env.DATABASE_FILE ?? path.join(dataDir, 'ibsam.db'));

for (const dir of [dataDir, uploadsDir, path.dirname(dbFile)]) {
  fs.mkdirSync(dir, { recursive: true });
}

export const config = {
  env,
  isProd: env === 'production',
  isTest: env === 'test',
  port: num(process.env.PORT, 3000),
  dataDir,
  uploadsDir,
  dbFile,
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${num(process.env.PORT, 3000)}`).replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  sessionTtlDays: num(process.env.SESSION_TTL_DAYS, 7),
  adminEmail: (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  contactEmail: process.env.CONTACT_NOTIFICATION_EMAIL ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'IBSAM® <no-reply@localhost>',
  maxUploadBytes: num(process.env.MAX_UPLOAD_BYTES, 8 * 1024 * 1024),
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml', 'image/gif'],
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export type AppConfig = typeof config;
