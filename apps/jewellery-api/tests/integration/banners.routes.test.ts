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

describe('banners', () => {
  it('creates a banner and returns it in the public hero listing', async () => {
    const created = await request(app)
      .post(`${base}/banners`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Festive Sale', image: 'https://example.com/b.jpg', placement: 'hero' });
    expect(created.status).toBe(201);

    const publicList = await request(app).get(`${base}/banners`).query({ placement: 'hero' });
    expect(publicList.status).toBe(200);
    expect(publicList.body.data).toHaveLength(1);
  });

  it('excludes inactive banners from the public listing but shows them via /all', async () => {
    await request(app)
      .post(`${base}/banners`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Draft banner', image: 'https://example.com/b.jpg', placement: 'hero', isActive: false });

    const publicList = await request(app).get(`${base}/banners`).query({ placement: 'hero' });
    expect(publicList.body.data).toHaveLength(0);

    const adminList = await request(app)
      .get(`${base}/banners/all`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(1);
  });
});
