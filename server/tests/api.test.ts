import http from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';
import { createApp } from '../src/app';
import { db, migrate } from '../src/db';
import { seedAll } from '../src/db/seed';
import { closeRealtime, initRealtime } from '../src/lib/realtime';

/**
 * End-to-end integration tests: real Express app, real SQLite schema,
 * real sessions/CSRF, real Socket.IO server. Nothing is mocked.
 */

const ADMIN = { name: 'Test Administrator', email: 'admin@ibsam.test', password: 'Str0ng!Passw0rd#2026' };

let server: http.Server;
let baseUrl: string;
let adminJar: Record<string, string> = {};

function jarFrom(res: request.Response): Record<string, string> {
  const raw = res.headers['set-cookie'] as unknown as string[] | string | undefined;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const jar: Record<string, string> = {};
  for (const cookie of list) {
    const [pair] = cookie.split(';');
    const index = pair.indexOf('=');
    if (index > 0) jar[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
  }
  return jar;
}

function cookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function asAdmin(req: request.Test, jar: Record<string, string> = adminJar): request.Test {
  return req.set('Cookie', cookieHeader(jar)).set('X-CSRF-Token', jar['ibsam_csrf'] ?? '');
}

function recordOf(res: request.Response): Record<string, any> {
  const data = res.body?.data;
  return data?.record ?? data?.item ?? data ?? {};
}

beforeAll(async () => {
  migrate();
  seedAll();

  server = http.createServer(createApp());
  initRealtime(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server');
  baseUrl = `http://127.0.0.1:${address.port}`;

  const bootstrap = await request(server)
    .post('/api/auth/bootstrap')
    .send(ADMIN)
    .expect(201);
  adminJar = jarFrom(bootstrap);
  expect(adminJar['ibsam_session']).toBeTruthy();
  expect(adminJar['ibsam_csrf']).toBeTruthy();
});

afterAll(async () => {
  await closeRealtime();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
});

describe('platform', () => {
  it('reports health and sets hardening headers', async () => {
    const res = await request(server).get('/api/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('serves seeded portfolio content publicly', async () => {
    const site = await request(server).get('/api/site').expect(200);
    expect(JSON.stringify(site.body)).toMatch(/Ibsam/i);

    const projects = await request(server).get('/api/projects').expect(200);
    const list = projects.body.data?.items ?? projects.body.data ?? [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);

    const slug = list[0].slug;
    const detail = await request(server).get(`/api/projects/${slug}`).expect(200);
    expect(JSON.stringify(detail.body)).toContain(slug);
  });
});

describe('authentication & authorization', () => {
  it('blocks anonymous access to the admin API', async () => {
    await request(server).get('/api/admin/overview').expect(401);
  });

  it('rejects invalid credentials without leaking which field failed', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: 'wrong-password-123!' })
      .expect(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('authenticates the session and returns the current user', async () => {
    const res = await request(server).get('/api/auth/me').set('Cookie', cookieHeader(adminJar)).expect(200);
    expect(res.body.data.user.email).toBe(ADMIN.email);
  });

  it('rejects state-changing admin requests without the CSRF token', async () => {
    const created = await asAdmin(request(server).post('/api/admin/content/projects')).send({
      title: 'CSRF Guarded Project',
      summary: 'Should never be persisted without the token.',
    });
    expect(created.status).toBe(201);
    const id = recordOf(created).id;

    await request(server)
      .patch(`/api/admin/content/projects/${id}`)
      .set('Cookie', cookieHeader(adminJar))
      .send({ title: 'Tampered' })
      .expect(403);

    const after = await asAdmin(request(server).get(`/api/admin/content/projects/${id}`)).expect(200);
    expect(recordOf(after).title).toBe('CSRF Guarded Project');

    await asAdmin(request(server).delete(`/api/admin/content/projects/${id}`)).expect(200);
  });

  it('enforces role permissions for read-only accounts', async () => {
    const viewer = { name: 'Read Only', email: 'viewer@ibsam.test', password: 'An0ther!Passw0rd#2026' };
    const createdUser = await asAdmin(request(server).post('/api/admin/users')).send({ ...viewer, role: 'VIEWER' });
    expect([200, 201]).toContain(createdUser.status);

    const login = await request(server).post('/api/auth/login').send({ email: viewer.email, password: viewer.password });
    expect(login.status).toBe(200);
    const viewerJar = jarFrom(login);

    await request(server).get('/api/admin/overview').set('Cookie', cookieHeader(viewerJar)).expect(200);

    const write = await asAdmin(
      request(server).post('/api/admin/content/projects'),
      viewerJar,
    ).send({ title: 'Viewer Should Not Create', summary: 'nope' });
    expect(write.status).toBe(403);
  });
});

describe('content persistence', () => {
  it('persists a project through create, public read, update and delete', async () => {
    const created = await asAdmin(request(server).post('/api/admin/content/projects')).send({
      title: 'Integration Test Project',
      summary: 'Created by the automated test suite.',
      technologies: ['React', 'Node.js'],
      published: true,
    });
    expect(created.status).toBe(201);
    const record = recordOf(created);
    expect(record.id).toBeTruthy();
    expect(record.slug).toBe('integration-test-project');

    const publicDetail = await request(server).get('/api/projects/integration-test-project').expect(200);
    expect(JSON.stringify(publicDetail.body)).toContain('Integration Test Project');

    const updated = await asAdmin(request(server).patch(`/api/admin/content/projects/${record.id}`)).send({
      title: 'Integration Test Project Renamed',
    });
    expect(updated.status).toBe(200);

    const listed = await asAdmin(request(server).get('/api/admin/content/projects?q=Renamed')).expect(200);
    const items = listed.body.data?.items ?? listed.body.data ?? [];
    expect(JSON.stringify(items)).toContain('Integration Test Project Renamed');

    await asAdmin(request(server).delete(`/api/admin/content/projects/${record.id}`)).expect(200);
    await request(server).get('/api/projects/integration-test-project').expect(404);
  });

  it('stores contact messages and surfaces them in the admin inbox', async () => {
    const submission = {
      name: 'Prospective Client',
      email: 'client@example.com',
      subject: 'New build enquiry',
      message: 'We would like to discuss a full-stack engagement for Q3.',
    };

    const sent = await request(server).post('/api/contact').send(submission);
    expect([200, 201]).toContain(sent.status);

    const inbox = await asAdmin(request(server).get('/api/admin/content/messages')).expect(200);
    const body = JSON.stringify(inbox.body);
    expect(body).toContain(submission.email);
    expect(body).toContain(submission.subject);

    const spam = await request(server)
      .post('/api/contact')
      .send({ ...submission, email: 'bot@example.com', company: 'Spam Co' });
    expect([200, 201]).toContain(spam.status);

    const after = await asAdmin(request(server).get('/api/admin/content/messages')).expect(200);
    expect(JSON.stringify(after.body)).not.toContain('bot@example.com');
  });
});

describe('realtime', () => {
  function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 8000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeoutMs);
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  }

  it('delivers contact:new only to authenticated admin sockets', async () => {
    const adminSocket = ioClient(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { Cookie: `ibsam_session=${adminJar['ibsam_session']}` },
    });

    await new Promise<void>((resolve, reject) => {
      adminSocket.once('connect', () => resolve());
      adminSocket.once('connect_error', (error) => reject(error));
    });

    const anonymous = ioClient(baseUrl, { transports: ['websocket'], reconnection: false });
    const anonError = await new Promise<Error>((resolve) => {
      anonymous.once('connect', () => resolve(new Error('anonymous socket unexpectedly connected')));
      anonymous.once('connect_error', (error) => resolve(error));
    });
    expect(anonError.message).toBe('unauthorized');
    anonymous.close();

    const received = waitForEvent<{ subject?: string; message?: { subject?: string } }>(adminSocket, 'contact:new');
    await request(server).post('/api/contact').send({
      name: 'Realtime Tester',
      email: 'realtime@example.com',
      subject: 'Realtime delivery check',
      message: 'This message must arrive over the socket channel.',
    });

    const payload = await received;
    expect(JSON.stringify(payload)).toContain('Realtime delivery check');

    adminSocket.close();
  });
});
