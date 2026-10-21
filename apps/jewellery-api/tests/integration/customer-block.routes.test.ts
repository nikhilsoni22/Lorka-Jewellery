import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';
import { UserRole } from '@lorka/types';
import { createApp, API_BASE_PATH } from '../../src/app';
import { signAccessToken } from '../../src/common/security/tokens';
import { hashPassword } from '../../src/common/security/password';
import { CategoryModel } from '../../src/modules/category/category.model';
import { ProductModel } from '../../src/modules/product/product.model';
import { SettingsModel } from '../../src/modules/settings/settings.model';
import { UserModel } from '../../src/modules/users/user.model';

const base = API_BASE_PATH;
let mongod: MongoMemoryServer;
let app: Express;
let adminToken: string;
let customerToken: string;
let customerId: string;
let productId: string;

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
  const user = await UserModel.create({
    name: 'Asha Verma',
    email: 'asha@example.com',
    passwordHash: await hashPassword('Secret123'),
    emailVerified: true,
  });
  customerId = user._id.toString();
  customerToken = signAccessToken({ sub: customerId, role: UserRole.Customer });
  await SettingsModel.create({ silverRatePerKg: 100000, razorpayKeyId: 'rzp_test', razorpayKeySecret: 'secret' });
  const category = await CategoryModel.create({ name: 'Rings', slug: 'rings' });
  const product = await ProductModel.create({
    name: 'Classic Silver Ring',
    slug: 'classic-silver-ring',
    sku: 'RNG-001',
    category: category._id,
    metalType: 'silver',
    makingCharge: 200,
    weight: 10,
    stock: 5,
  });
  productId = product._id.toString();
});

const checkout = () => ({
  customerName: 'Asha Verma',
  customerPhone: '9876543210',
  shippingAddress: { line1: '12 Main Road', city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001' },
  items: [{ productId, quantity: 1 }],
});

const block = (id: string, body: object) =>
  request(app).patch(`${base}/users/${id}/block`).set('Authorization', `Bearer ${adminToken}`).send(body);

describe('blocking a customer', () => {
  it('stops orders and reviews but still allows sign-in and support tickets', async () => {
    const blocked = await block(customerId, { blocked: true, reason: 'Repeated fake orders' });
    expect(blocked.status).toBe(200);
    expect(blocked.body.data).toMatchObject({ isBlocked: true, blockedReason: 'Repeated fake orders' });

    const auth = { Authorization: `Bearer ${customerToken}` };
    expect((await request(app).post(`${base}/orders`).set(auth).send({ ...checkout(), paymentMethod: 'cod' })).status).toBe(403);
    // Refused before any Razorpay order is created, so the customer is never charged.
    expect((await request(app).post(`${base}/payments/razorpay/order`).set(auth).send(checkout())).status).toBe(403);
    const review = await request(app).post(`${base}/reviews/product/${productId}`).set(auth).send({ rating: 1, comment: 'spam' });
    expect(review.status).toBe(403);

    const ticket = await request(app).post(`${base}/tickets`).set(auth).send({ subject: 'Why am I blocked?', message: 'Please help' });
    expect(ticket.status).toBe(201);

    const login = await request(app).post(`${base}/auth/login`).send({ email: 'asha@example.com', password: 'Secret123' });
    expect(login.status).toBe(200);
    expect(login.body.data.user).toMatchObject({ isBlocked: true, blockedReason: 'Repeated fake orders' });
  });

  it('lets the customer order again once unblocked', async () => {
    await block(customerId, { blocked: true }).expect(200);
    const unblocked = await block(customerId, { blocked: false });
    expect(unblocked.body.data).toMatchObject({ isBlocked: false });

    const order = await request(app)
      .post(`${base}/orders`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...checkout(), paymentMethod: 'cod' });
    expect(order.status).toBe(201);
  });

  it('refuses to block staff accounts, and only admins can block', async () => {
    const admin = await UserModel.create({ name: 'Owner', email: 'owner@example.com', passwordHash: 'x', role: UserRole.Admin });
    expect((await block(admin._id.toString(), { blocked: true })).status).toBe(400);

    const asCustomer = await request(app)
      .patch(`${base}/users/${customerId}/block`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ blocked: true });
    expect(asCustomer.status).toBe(403);
  });
});
