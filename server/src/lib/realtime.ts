import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { config } from '../config';
import { SESSION_COOKIE, resolveSessionToken } from './auth';

let io: SocketServer | null = null;
const online = new Map<string, { name: string; sockets: number }>();

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=');
    if (index > 0) acc[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return acc;
  }, {});
}

function presencePayload() {
  return {
    online: online.size,
    users: Array.from(online.entries()).map(([id, value]) => ({ id, name: value.name })),
  };
}

export function initRealtime(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    path: '/socket.io',
    serveClient: false,
    cors: {
      origin: [config.publicUrl, ...config.corsOrigins, 'http://localhost:5173'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const session = resolveSessionToken(cookies[SESSION_COOKIE]);
    if (!session) {
      next(new Error('unauthorized'));
      return;
    }
    if (!session.user.permissions.includes('dashboard:read')) {
      next(new Error('forbidden'));
      return;
    }
    socket.data.user = session.user;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as { id: string; name: string };
    socket.join('admins');
    socket.join(`user:${user.id}`);

    const entry = online.get(user.id) ?? { name: user.name, sockets: 0 };
    entry.sockets += 1;
    online.set(user.id, entry);
    io?.to('admins').emit('admin:presence', presencePayload());

    socket.emit('notification:new', { type: 'system', title: 'Realtime channel connected' });

    socket.on('admin:ping', () => {
      socket.emit('admin:pong', { at: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
      const current = online.get(user.id);
      if (current) {
        current.sockets -= 1;
        if (current.sockets <= 0) online.delete(user.id);
      }
      io?.to('admins').emit('admin:presence', presencePayload());
    });
  });

  return io;
}

export function emitToAdmins(event: string, payload: unknown): void {
  io?.to('admins').emit(event, payload);
}

export function presenceSnapshot() {
  return presencePayload();
}

export function closeRealtime(): Promise<void> {
  return new Promise((resolve) => {
    if (!io) {
      resolve();
      return;
    }
    io.close(() => resolve());
    io = null;
  });
}
