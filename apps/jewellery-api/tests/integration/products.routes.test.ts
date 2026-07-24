import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';
import { UserRole } from '@lorka/types';
import { createApp, API_BASE_PATH } from '../../src/app';
import { signAccessToken } from '../../src/common/security/tokens';
import { CategoryModel } from '../../src/modules/category/category.model';

const base = API_BASE_PATH;
let mongod: MongoMemoryServer;
let app: Express;
let adminToken: string;
let customerToken: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
  adminToken = signAccessToken({ sub: '65f0c0c0c0c0c0c0c0c0c001', role: UserRole.SuperAdmin });
  customerToken = signAccessToken({ sub: '65f0c0c0c0c0c0c0c0c0c002', role: UserRole.Customer });
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

async function createCategory(): Promise<string> {
  const category = await CategoryModel.create({ name: 'Rings', slug: 'rings' });
  return category._id.toString();
}

function productPayload(categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Classic Silver Ring',
    sku: 'RNG-001',
    metalType: 'silver',
    makingCharge: 200,
    weight: 10,
    images: ['https://example.com/ring.jpg'],
    category: categoryId,
    stock: 10,
    ...overrides,
  };
}

describe('GET /products (public)', () => {
  it('lists products without authentication', async () => {
    const categoryId = await createCategory();
    await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId));

    const res = await request(app).get(`${base}/products`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, total: 1 });
  });

  it('filters by category', async () => {
    const categoryId = await createCategory();
    const otherCategory = await CategoryModel.create({ name: 'Chains', slug: 'chains' });
    await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId));
    await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(otherCategory._id.toString(), { sku: 'CHN-001', name: 'Silver Chain' }));

    const res = await request(app).get(`${base}/products`).query({ category: categoryId });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].sku).toBe('RNG-001');
  });
});

describe('GET /products/slug/:slug (public)', () => {
  it('returns 404 for a non-existent slug', async () => {
    const res = await request(app).get(`${base}/products/slug/does-not-exist`);
    expect(res.status).toBe(404);
  });
});

describe('POST /products (admin only)', () => {
  it('rejects requests with no token', async () => {
    const categoryId = await createCategory();
    const res = await request(app).post(`${base}/products`).send(productPayload(categoryId));
    expect(res.status).toBe(401);
  });

  it('rejects a customer-role token with 403', async () => {
    const categoryId = await createCategory();
    const res = await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(productPayload(categoryId));
    expect(res.status).toBe(403);
  });

  it('creates a product for an admin token', async () => {
    const categoryId = await createCategory();
    const res = await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId));
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('classic-silver-ring');
  });

  it('rejects an invalid payload with 400', async () => {
    const res = await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('accepts a blank discountPercent field as "no offer" (not a validation error)', async () => {
    const categoryId = await createCategory();
    const res = await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId, { discountPercent: '' }));
    expect(res.status).toBe(201);
    expect(res.body.data.discountPercent).toBeUndefined();
    expect(res.body.data.discountPrice).toBeUndefined();
  });
});

describe('PUT/DELETE /products/:id (admin only)', () => {
  it('updates and then deletes a product', async () => {
    const categoryId = await createCategory();
    const created = await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId));
    const id = created.body.data.id;

    const updated = await request(app)
      .put(`${base}/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ makingCharge: 300 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.makingCharge).toBe(300);

    const deleted = await request(app)
      .delete(`${base}/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);

    const getAfterDelete = await request(app)
      .get(`${base}/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getAfterDelete.status).toBe(404);
  });

  it('removes an existing offer when discountPercent is cleared on update', async () => {
    const categoryId = await createCategory();
    const created = await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId, { discountPercent: 20 }));
    const id = created.body.data.id;
    expect(created.body.data.discountPercent).toBe(20);
    expect(created.body.data.discountPrice).toBeDefined();

    const cleared = await request(app)
      .put(`${base}/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discountPercent: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.discountPercent).toBeUndefined();
    expect(cleared.body.data.discountPrice).toBeUndefined();

    const refetched = await request(app)
      .get(`${base}/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(refetched.body.data.discountPercent).toBeUndefined();
  });

  it('recomputes product price live from the admin-set silver rate', async () => {
    const categoryId = await createCategory();
    const created = await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productPayload(categoryId, { weight: 10, makingCharge: 200 }));
    const id = created.body.data.id;

    await request(app)
      .put(`${base}/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        silverRatePerKg: 1000,
        goldRatePer10g: 5000,
        charges: [],
        maintenance: { enabled: false },
      })
      .expect(200);

    const res = await request(app)
      .get(`${base}/products/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    // weight(10) * (1000/1000 per-gram) + makingCharge(200)
    expect(res.body.data.price).toBe(210);
  });
});
