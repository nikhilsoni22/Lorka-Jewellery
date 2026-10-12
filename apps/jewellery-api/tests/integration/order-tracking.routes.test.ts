import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';
import { OrderStatus, UserRole } from '@lorka/types';
import { createApp, API_BASE_PATH } from '../../src/app';
import { signAccessToken } from '../../src/common/security/tokens';
import { OrderModel } from '../../src/modules/order/order.model';

const base = API_BASE_PATH;
const customerId = '65f0c0c0c0c0c0c0c0c0c002';
let mongod: MongoMemoryServer;
let app: Express;
let adminToken: string;
let customerToken: string;
let otherCustomerToken: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
  adminToken = signAccessToken({ sub: '65f0c0c0c0c0c0c0c0c0c001', role: UserRole.SuperAdmin });
  customerToken = signAccessToken({ sub: customerId, role: UserRole.Customer });
  otherCustomerToken = signAccessToken({ sub: '65f0c0c0c0c0c0c0c0c0c003', role: UserRole.Customer });
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

async function seedOrder(overrides: Record<string, unknown> = {}) {
  const order = await OrderModel.create({
    orderNumber: 'ORD-20261012-ABCDE',
    userId: customerId,
    status: OrderStatus.Pending,
    statusHistory: [{ status: OrderStatus.Pending, at: new Date('2026-10-10T10:00:00Z') }],
    customerName: 'Test Customer',
    customerPhone: '9876543210',
    shippingAddress: { line1: '12 Main Road', city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001' },
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Classic Silver Ring',
        unitPrice: 1000,
        quantity: 1,
        subtotal: 1000,
      },
    ],
    subtotal: 1000,
    total: 1000,
    ...overrides,
  });
  return order._id.toString();
}

function setStatus(id: string, status: OrderStatus) {
  return request(app)
    .patch(`${base}/orders/${id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status });
}

describe('order status history', () => {
  it('records each status change with a timestamp, visible to the customer', async () => {
    const id = await seedOrder();
    await setStatus(id, OrderStatus.Confirmed);
    await setStatus(id, OrderStatus.Shipped);

    const res = await request(app)
      .get(`${base}/orders/mine/ORD-20261012-ABCDE`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(OrderStatus.Shipped);
    expect(res.body.data.statusHistory.map((e: { status: string }) => e.status)).toEqual([
      OrderStatus.Pending,
      OrderStatus.Confirmed,
      OrderStatus.Shipped,
    ]);
  });

  it('does not add a duplicate event when the status is saved unchanged', async () => {
    const id = await seedOrder();
    await setStatus(id, OrderStatus.Confirmed);
    const res = await setStatus(id, OrderStatus.Confirmed);

    expect(res.status).toBe(200);
    expect(res.body.data.statusHistory).toHaveLength(2);
  });

  it('backfills history for orders created before it was recorded', async () => {
    await seedOrder({ status: OrderStatus.Shipped, statusHistory: [] });

    const res = await request(app).get(
      `${base}/orders/track?orderNumber=ORD-20261012-ABCDE&phone=9876543210`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.statusHistory.map((e: { status: string }) => e.status)).toEqual([
      OrderStatus.Pending,
      OrderStatus.Shipped,
    ]);
  });

  it("does not expose another customer's order through /orders/mine", async () => {
    await seedOrder();

    const res = await request(app)
      .get(`${base}/orders/mine/ORD-20261012-ABCDE`)
      .set('Authorization', `Bearer ${otherCustomerToken}`);

    expect(res.status).toBe(404);
  });
});
