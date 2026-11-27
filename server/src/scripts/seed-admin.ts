/**
 * Creates the first administrator account from ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * Usage: npm run seed:admin
 * If ADMIN_PASSWORD is omitted a cryptographically random password is generated
 * and printed once to this terminal — it is never stored in plaintext.
 */
import crypto from 'node:crypto';
import 'dotenv/config';
import { config } from '../config';
import { db, migrate } from '../db';
import { seedAll } from '../db/seed';
import { hashPassword, userCount } from '../lib/auth';

async function main(): Promise<void> {
  migrate();
  seedAll();

  const email = (config.adminEmail || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) {
    console.error('Set ADMIN_EMAIL (and optionally ADMIN_PASSWORD) before running this script.');
    process.exit(1);
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
  if (existing) {
    console.error(`An account for ${email} already exists. Use the admin dashboard to change credentials.`);
    process.exit(1);
  }

  const password = config.adminPassword || crypto.randomBytes(12).toString('base64url');
  if (password.length < 10) {
    console.error('ADMIN_PASSWORD must be at least 10 characters.');
    process.exit(1);
  }

  const role = db.prepare("SELECT id FROM roles WHERE name = 'ADMIN'").get() as { id: number } | undefined;
  if (!role) {
    console.error('Roles are missing — run the server once to apply migrations.');
    process.exit(1);
  }

  db.prepare('INSERT INTO users (id, email, password_hash, name, role_id) VALUES (?, ?, ?, ?, ?)').run(
    crypto.randomUUID(),
    email,
    await hashPassword(password),
    process.env.ADMIN_NAME ?? 'Muhammad Ibsam',
    role.id,
  );

  console.log('Administrator created.');
  console.log(`  email:    ${email}`);
  if (!config.adminPassword) console.log(`  password: ${password}   (generated — store it now)`);
  console.log(`  existing accounts: ${userCount()}`);
  db.close();
}

void main();
