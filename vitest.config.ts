import { defineConfig } from 'vitest/config';

/**
 * Integration tests run against the real Express app, the real SQLite schema
 * and a real Socket.IO server — no mocks. Each run gets a throwaway data
 * directory so a local database is never touched.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATA_DIR: `./.tmp/test-data-${Date.now()}`,
      PUBLIC_URL: 'http://127.0.0.1:3999',
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD: '',
      RESEND_API_KEY: '',
      CONTACT_NOTIFICATION_EMAIL: '',
    },
  },
});
