import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { config } from './config';
import { attachUser } from './lib/auth';
import { HttpError } from './lib/http';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { mediaRouter, resumeRouter, settingsRouter } from './routes/media';
import { docsRouter } from './routes/docs';

const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // The Swagger reference page and the animated UI rely on inline styles;
      // a strict CSP is documented in docs/SECURITY.md as a deployment hardening step.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: config.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
    }),
  );

  const allowlist = config.corsOrigins.length > 0 ? config.corsOrigins : [config.publicUrl];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowlist.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use(cookieParser());

  app.use(
    '/uploads',
    express.static(config.uploadsDir, {
      maxAge: '7d',
      etag: true,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
      },
    }),
  );

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 400,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, error: { message: 'Too many requests. Please slow down.', status: 429 } },
    }),
  );

  app.use('/api', attachUser);

  app.use('/api/auth', authRouter);
  app.use('/api/admin/settings', settingsRouter);
  app.use('/api/admin/media', mediaRouter);
  app.use('/api/admin/resume', resumeRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', docsRouter);
  app.use('/api', publicRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: { message: 'Endpoint not found', status: 404 } });
  });

  if (fs.existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
          if (/\.(js|css|woff2?)$/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
        return next();
      }
      return res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);

    if (err instanceof HttpError) {
      return res.status(err.status).json({
        success: false,
        error: { message: err.message, status: err.status, details: err.details },
      });
    }

    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `File too large. Maximum size is ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`
          : err.message;
      return res.status(422).json({ success: false, error: { message, status: 422 } });
    }

    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ success: false, error: { message: 'Malformed JSON body', status: 400 } });
    }

    const message = err instanceof Error ? err.message : 'Unexpected server error';
    if (/Unsupported file type/.test(message)) {
      return res.status(422).json({ success: false, error: { message, status: 422 } });
    }

    if (!config.isProd) console.error('[api] unhandled error:', err);
    return res.status(500).json({
      success: false,
      error: { message: config.isProd ? 'Something went wrong. Please try again.' : message, status: 500 },
    });
  });

  return app;
}
