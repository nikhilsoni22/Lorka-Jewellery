import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';
import { UserRole } from '@lorka/types';
import { createApp, API_BASE_PATH } from '../../src/app';
import { signAccessToken } from '../../src/common/security/tokens';

const base = API_BASE_PATH;
let mongod: MongoMemoryServer;
let app: Express;
let adminToken: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
  adminToken = signAccessToken({ sub: '65f0c0c0c0c0c0c0c0c0c001', role: UserRole.SuperAdmin });
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

describe('categories', () => {
  it('creates, publicly lists, and deletes a category', async () => {
    const created = await request(app)
      .post(`${base}/categories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Silver Bracelets' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('silver-bracelets');

    const list = await request(app).get(`${base}/categories`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const del = await request(app)
      .delete(`${base}/categories/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('rejects create without a token', async () => {
    const res = await request(app).post(`${base}/categories`).send({ name: 'x' });
    expect(res.status).toBe(401);
  });
});
