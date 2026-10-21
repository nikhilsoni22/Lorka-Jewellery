import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://localhost:27017/lorka_test',
      JWT_ACCESS_SECRET: 'test-access-secret-1234567890',
      JWT_REFRESH_SECRET: 'test-refresh-secret-1234567890',
      ACCESS_TOKEN_TTL_MIN: '15',
      // Keep Google login disabled in tests even if the local .env enables it.
      FIREBASE_PROJECT_ID: '',
      // Never send real email from tests, whatever mailer the local .env configures.
      BREVO_API_KEY: '',
      RESEND_API_KEY: '',
      SMTP_USER: '',
      SMTP_PASS: '',
    },
  },
});
