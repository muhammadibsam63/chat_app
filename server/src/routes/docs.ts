import { Router } from 'express';
import { RESOURCES } from '../resources';
import { ok } from '../lib/http';

export const docsRouter = Router();

const errorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: { message: { type: 'string' }, status: { type: 'integer' }, details: {} },
    },
  },
};

const envelope = (dataSchema: Record<string, unknown>) => ({
  type: 'object',
  properties: { success: { type: 'boolean' }, data: dataSchema, meta: { type: 'object' } },
});

const listEnvelope = envelope({ type: 'array', items: { type: 'object' } });

function resourcePaths(): Record<string, unknown> {
  const paths: Record<string, unknown> = {};
  for (const resource of Object.values(RESOURCES)) {
    paths[`/admin/content/${resource.name}`] = {
      get: {
        tags: ['Admin content'],
        summary: `List ${resource.label}`,
        description: resource.description,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: `Search ${resource.searchable.join(', ')}` },
        ],
        responses: { 200: { description: 'Paginated list', content: { 'application/json': { schema: listEnvelope } } } },
      },
      post: {
        tags: ['Admin content'],
        summary: `Create ${resource.singular}`,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${resource.name}` } } },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: envelope({ type: 'object' }) } } },
          422: { description: 'Validation failed', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    };
    paths[`/admin/content/${resource.name}/{id}`] = {
      get: {
        tags: ['Admin content'],
        summary: `Get one ${resource.singular}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Record' }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Admin content'],
        summary: `Update ${resource.singular}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated record' }, 422: { description: 'Validation failed' } },
      },
      delete: {
        tags: ['Admin content'],
        summary: `Delete ${resource.singular}`,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    };
  }
  return paths;
}

function resourceSchemas(): Record<string, unknown> {
  const schemas: Record<string, unknown> = {};
  for (const resource of Object.values(RESOURCES)) {
    const properties: Record<string, unknown> = { id: { type: 'string', format: 'uuid' } };
    const required: string[] = [];
    for (const field of resource.fields) {
      const base: Record<string, unknown> = { description: field.label };
      switch (field.type) {
        case 'number':
          base.type = 'number';
          break;
        case 'boolean':
          base.type = 'boolean';
          break;
        case 'json':
          base.type = 'array';
          base.items = {};
          break;
        default:
          base.type = 'string';
          if (field.maxLength) base.maxLength = field.maxLength;
      }
      properties[field.name] = base;
      if (field.required) required.push(field.name);
    }
    schemas[resource.name] = { type: 'object', properties, required };
  }
  return schemas;
}

export function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'IBSAM® Portfolio Ecosystem API',
      version: '1.0.0',
      description:
        'REST API for the IBSAM® portfolio and content management ecosystem. Session authentication uses the HTTP-only `ibsam_session` cookie; state-changing admin requests must also echo the readable `ibsam_csrf` cookie in the `X-CSRF-Token` header.',
    },
    servers: [{ url: '/api', description: 'Same-origin API' }],
    tags: [
      { name: 'Public' },
      { name: 'Auth' },
      { name: 'Admin' },
      { name: 'Admin content' },
      { name: 'Realtime' },
    ],
    components: {
      securitySchemes: {
        sessionCookie: { type: 'apiKey', in: 'cookie', name: 'ibsam_session' },
        csrfToken: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
      },
      schemas: {
        ...resourceSchemas(),
        ContactInput: {
          type: 'object',
          required: ['name', 'email', 'message'],
          properties: {
            name: { type: 'string', maxLength: 80 },
            email: { type: 'string', format: 'email' },
            subject: { type: 'string', maxLength: 140 },
            message: { type: 'string', minLength: 20, maxLength: 4000 },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 10 },
          },
        },
        Error: errorSchema,
      },
    },
    security: [{ sessionCookie: [] }],
    paths: {
      '/health': { get: { tags: ['Public'], summary: 'Liveness probe', responses: { 200: { description: 'Service up' } } } },
      '/health/ready': {
        get: { tags: ['Public'], summary: 'Readiness probe including database', responses: { 200: { description: 'Ready' } } },
      },
      '/site': { get: { tags: ['Public'], summary: 'Public site settings', responses: { 200: { description: 'Settings' } } } },
      '/stats': { get: { tags: ['Public'], summary: 'Aggregate content counts', responses: { 200: { description: 'Counts' } } } },
      '/projects': {
        get: {
          tags: ['Public'],
          summary: 'List published projects',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'featured', in: 'query', schema: { type: 'boolean' } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['order', 'recent', 'title'] } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Projects' } },
        },
      },
      '/projects/{slug}': {
        get: {
          tags: ['Public'],
          summary: 'Project detail with case study and related projects',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Project detail' }, 404: { description: 'Not found' } },
        },
      },
      '/case-studies': { get: { tags: ['Public'], summary: 'List case studies', responses: { 200: { description: 'Case studies' } } } },
      '/skills': { get: { tags: ['Public'], summary: 'List skills grouped by category', responses: { 200: { description: 'Skills' } } } },
      '/experience': { get: { tags: ['Public'], summary: 'Employment history', responses: { 200: { description: 'Experience' } } } },
      '/education': { get: { tags: ['Public'], summary: 'Education', responses: { 200: { description: 'Education' } } } },
      '/certifications': { get: { tags: ['Public'], summary: 'Certifications', responses: { 200: { description: 'Certifications' } } } },
      '/achievements': { get: { tags: ['Public'], summary: 'Achievements', responses: { 200: { description: 'Achievements' } } } },
      '/services': { get: { tags: ['Public'], summary: 'Services', responses: { 200: { description: 'Services' } } } },
      '/testimonials': { get: { tags: ['Public'], summary: 'Testimonials', responses: { 200: { description: 'Testimonials' } } } },
      '/blog': { get: { tags: ['Public'], summary: 'List published posts', responses: { 200: { description: 'Posts' } } } },
      '/blog/{slug}': {
        get: {
          tags: ['Public'],
          summary: 'Post detail (increments view counter)',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Post' }, 404: { description: 'Not found' } },
        },
      },
      '/resume': { get: { tags: ['Public'], summary: 'Active resume file', responses: { 200: { description: 'Resume metadata' } } } },
      '/contact': {
        post: {
          tags: ['Public'],
          summary: 'Submit a contact message',
          description: 'Validated server-side, rate limited to 5 messages per hour per IP, persisted and broadcast to admins.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ContactInput' } } },
          },
          responses: {
            201: { description: 'Message stored' },
            422: { description: 'Validation failed' },
            429: { description: 'Rate limited' },
          },
        },
      },
      '/analytics/pageview': {
        post: { tags: ['Public'], summary: 'Record a page view', responses: { 201: { description: 'Recorded' } } },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Sign in and receive session + CSRF cookies',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
          },
          responses: {
            200: { description: 'Authenticated' },
            401: { description: 'Invalid credentials' },
            429: { description: 'Too many attempts' },
          },
        },
      },
      '/auth/me': { get: { tags: ['Auth'], summary: 'Current session user', responses: { 200: { description: 'User' } } } },
      '/auth/logout': { post: { tags: ['Auth'], summary: 'Revoke current session', responses: { 200: { description: 'Signed out' } } } },
      '/auth/bootstrap': {
        post: {
          tags: ['Auth'],
          summary: 'Create the first administrator (only while no users exist)',
          responses: { 201: { description: 'Admin created' }, 409: { description: 'Already bootstrapped' } },
        },
      },
      '/auth/change-password': { post: { tags: ['Auth'], summary: 'Change own password', responses: { 200: { description: 'Updated' } } } },
      '/auth/sessions': { get: { tags: ['Auth'], summary: 'List active sessions', responses: { 200: { description: 'Sessions' } } } },
      '/auth/sessions/{id}': { delete: { tags: ['Auth'], summary: 'Revoke a session', responses: { 200: { description: 'Revoked' } } } },
      '/auth/forgot-password': {
        post: { tags: ['Auth'], summary: 'Request a password reset token', responses: { 200: { description: 'Accepted' } } },
      },
      '/auth/reset-password': {
        post: { tags: ['Auth'], summary: 'Complete a password reset', responses: { 200: { description: 'Password updated' } } },
      },
      '/admin/overview': { get: { tags: ['Admin'], summary: 'Dashboard overview', responses: { 200: { description: 'Overview' } } } },
      '/admin/analytics': { get: { tags: ['Admin'], summary: 'Traffic and message analytics', responses: { 200: { description: 'Analytics' } } } },
      '/admin/notifications': { get: { tags: ['Admin'], summary: 'List notifications', responses: { 200: { description: 'Notifications' } } } },
      '/admin/notifications/{id}/read': { post: { tags: ['Admin'], summary: 'Mark notification read', responses: { 200: { description: 'Updated' } } } },
      '/admin/activity': { get: { tags: ['Admin'], summary: 'Audit log', responses: { 200: { description: 'Activity' } } } },
      '/admin/users': { get: { tags: ['Admin'], summary: 'List users', responses: { 200: { description: 'Users' } } } },
      '/admin/roles': { get: { tags: ['Admin'], summary: 'Roles and permissions', responses: { 200: { description: 'Roles' } } } },
      '/admin/media': {
        get: { tags: ['Admin'], summary: 'Media library', responses: { 200: { description: 'Assets' } } },
        post: {
          tags: ['Admin'],
          summary: 'Upload an image or document',
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } },
          },
          responses: { 201: { description: 'Uploaded' }, 422: { description: 'Rejected file' } },
        },
      },
      '/admin/resume': {
        get: { tags: ['Admin'], summary: 'Resume versions', responses: { 200: { description: 'Resumes' } } },
        post: {
          tags: ['Admin'],
          summary: 'Upload a resume (PDF/DOC/DOCX)',
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } },
          },
          responses: { 201: { description: 'Uploaded' } },
        },
      },
      '/admin/settings': {
        get: { tags: ['Admin'], summary: 'Read site settings', responses: { 200: { description: 'Settings' } } },
        put: { tags: ['Admin'], summary: 'Update site settings', responses: { 200: { description: 'Updated' } } },
      },
      ...resourcePaths(),
    },
    'x-realtime': {
      namespace: '/realtime',
      authentication: 'ibsam_session cookie validated during the Socket.IO handshake; only authenticated admins join the admin room.',
      events: [
        { name: 'contact:new', payload: 'ContactMessage', audience: 'admins' },
        { name: 'contact:updated', payload: 'ContactMessage', audience: 'admins' },
        { name: 'notification:new', payload: '{ id, type, title, body }', audience: 'admins' },
        { name: 'project:created', payload: 'Project', audience: 'admins' },
        { name: 'project:updated', payload: 'Project', audience: 'admins' },
        { name: 'project:deleted', payload: '{ id }', audience: 'admins' },
        { name: 'admin:presence', payload: '{ online: Admin[] }', audience: 'admins' },
      ],
    },
  };
}

docsRouter.get('/openapi.json', (_req, res) => ok(res, openApiDocument()));

docsRouter.get('/docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>IBSAM® API reference</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
    <style>
      body { margin: 0; background: #07090d; }
      .topbar { display: none; }
      .swagger-ui .info .title { color: #f5c542; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui', deepLinking: true });
      };
    </script>
  </body>
</html>`);
});
