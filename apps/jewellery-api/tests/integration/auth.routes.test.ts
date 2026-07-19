import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';
import { UserRole } from '@lorka/types';
import { createApp, API_BASE_PATH } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { hashPassword } from '../../src/common/security/password';

const base = API_BASE_PATH;
let mongod: MongoMemoryServer;
let app: Express;

async function seedAdmin(role: UserRole = UserRole.SuperAdmin) {
  await UserModel.create({
    name: 'Super Admin',
    email: 'admin@lorka.com',
    passwordHash: await hashPassword('Admin@12345'),
    role,
    emailVerified: true,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  }
});

describe('GET /health', () => {
  it('reports ok and a connected database', async () => {
    const res = await request(app).get(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok', db: 'connected' } });
  });
});

describe('POST /auth/admin/login', () => {
  it('logs an admin in and sets a refresh cookie', async () => {
    await seedAdmin();
    const res = await request(app)
      .post(`${base}/auth/admin/login`)
      .send({ email: 'admin@lorka.com', password: 'Admin@12345' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe(UserRole.SuperAdmin);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('rejects a wrong password with 401', async () => {
    await seedAdmin();
    const res = await request(app)
      .post(`${base}/auth/admin/login`)
      .send({ email: 'admin@lorka.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a customer account with 403', async () => {
    await UserModel.create({
      name: 'Jane',
      email: 'jane@example.com',
      passwordHash: await hashPassword('Secret123'),
      role: UserRole.Customer,
    });
    const res = await request(app)
      .post(`${base}/auth/admin/login`)
      .send({ email: 'jane@example.com', password: 'Secret123' });
    expect(res.status).toBe(403);
  });

  it('rejects an invalid payload with 400', async () => {
    const res = await request(app).post(`${base}/auth/admin/login`).send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('refresh + me flow', () => {
  it('rotates the refresh cookie and returns the current user', async () => {
    await seedAdmin();
    const agent = request.agent(app);

    const login = await agent
      .post(`${base}/auth/admin/login`)
      .send({ email: 'admin@lorka.com', password: 'Admin@12345' });
    expect(login.status).toBe(200);
    const accessToken = login.body.data.accessToken as string;

    const refreshed = await agent.post(`${base}/auth/refresh`).send({});
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    const me = await agent.get(`${base}/auth/me`).set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('admin@lorka.com');
  });
});

describe('deferred providers', () => {
  it('returns 501 for google login', async () => {
    const res = await request(app).post(`${base}/auth/google`).send({});
    expect(res.status).toBe(501);
  });
});
