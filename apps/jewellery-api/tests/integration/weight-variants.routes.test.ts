import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';
import { OrderStatus, UserRole } from '@lorka/types';
import { createApp, API_BASE_PATH } from '../../src/app';
import { signAccessToken } from '../../src/common/security/tokens';
import { CategoryModel } from '../../src/modules/category/category.model';
import { ProductModel } from '../../src/modules/product/product.model';
import { SettingsModel } from '../../src/modules/settings/settings.model';

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
  // Silver at ₹100/g.
  await SettingsModel.create({ silverRatePerKg: 100000 });
});

/** Silver ₹100/g + ₹20/g making = ₹120/g: 16g → ₹1920, 25g → ₹3000. */
async function seedChain() {
  const category = await CategoryModel.create({ name: 'Chains', slug: 'chains' });
  const product = await ProductModel.create({
    name: 'Silk Chain',
    slug: 'silk-chain',
    sku: 'CHN-001',
    category: category._id,
    metalType: 'silver',
    makingChargePerGram: 20,
    variants: [
      { weight: 16, stock: 4 },
      { weight: 25, stock: 2 },
    ],
    images: ['https://example.com/chain.jpg'],
  });
  return product._id.toString();
}

function placeOrder(items: Record<string, unknown>[]) {
  return request(app)
    .post(`${base}/orders`)
    .send({
      customerName: 'Asha Verma',
      customerPhone: '9876543210',
      customerEmail: 'asha@example.com',
      shippingAddress: { line1: '12 Main Road', city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001' },
      paymentMethod: 'cod',
      items,
    });
}

async function stockByWeight(productId: string) {
  const product = await ProductModel.findById(productId).lean();
  return Object.fromEntries(product!.variants.map((v) => [v.weight, v.stock]));
}

describe('products in several weights', () => {
  it('prices every weight on its own; the lightest is the "from" price', async () => {
    const productId = await seedChain();
    const res = await request(app).get(`${base}/products/${productId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.variants).toMatchObject([
      { weight: 16, stock: 4, price: 1920, priceBreakup: { metalValue: 1600, makingCharge: 320 } },
      { weight: 25, stock: 2, price: 3000, priceBreakup: { metalValue: 2500, makingCharge: 500 } },
    ]);
    expect(res.body.data).toMatchObject({ weight: 16, price: 1920, stock: 6 });
  });

  it('creates a product with its weights stored lightest first', async () => {
    const category = await CategoryModel.create({ name: 'Chains', slug: 'chains' });
    const res = await request(app)
      .post(`${base}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Silk Chain',
        sku: 'CHN-002',
        metalType: 'silver',
        makingChargePerGram: 20,
        category: category._id.toString(),
        images: ['https://example.com/chain.jpg'],
        variants: [
          { weight: 25, stock: 1 },
          { weight: 16, stock: 3 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.variants.map((v: { weight: number }) => v.weight)).toEqual([16, 25]);
  });

  it('charges the chosen weight and takes stock from that weight only', async () => {
    const productId = await seedChain();
    const res = await placeOrder([{ productId, weight: 25, quantity: 2 }]);
    expect(res.status).toBe(201);
    expect(res.body.data.items[0]).toMatchObject({ weight: 25, unitPrice: 3000, quantity: 2, subtotal: 6000 });
    expect(await stockByWeight(productId)).toEqual({ 16: 4, 25: 0 });
  });

  it('rejects more than the chosen weight has in stock, even if another weight has enough', async () => {
    const productId = await seedChain();
    const res = await placeOrder([{ productId, weight: 25, quantity: 3 }]);
    expect(res.status).toBe(409);
    expect(await stockByWeight(productId)).toEqual({ 16: 4, 25: 2 });
  });

  it('rejects a weight the product does not come in', async () => {
    const productId = await seedChain();
    const res = await placeOrder([{ productId, weight: 20, quantity: 1 }]);
    expect(res.status).toBe(400);
  });

  it('uses the lightest weight when the cart item has none (carts saved before weights existed)', async () => {
    const productId = await seedChain();
    const res = await placeOrder([{ productId, quantity: 1 }]);
    expect(res.status).toBe(201);
    expect(res.body.data.items[0]).toMatchObject({ weight: 16, unitPrice: 1920 });
    expect(await stockByWeight(productId)).toEqual({ 16: 3, 25: 2 });
  });

  it('puts stock back on the right weight when the order is cancelled', async () => {
    const productId = await seedChain();
    const order = await placeOrder([
      { productId, weight: 16, quantity: 1 },
      { productId, weight: 25, quantity: 2 },
    ]);
    expect(await stockByWeight(productId)).toEqual({ 16: 3, 25: 0 });

    await request(app)
      .patch(`${base}/orders/${order.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrderStatus.Cancelled })
      .expect(200);
    expect(await stockByWeight(productId)).toEqual({ 16: 4, 25: 2 });
  });

  it('lists the product as in stock while any weight has stock', async () => {
    const productId = await seedChain();
    await placeOrder([{ productId, weight: 25, quantity: 2 }]);
    const res = await request(app).get(`${base}/products?inStock=true`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].variants[1]).toMatchObject({ weight: 25, stock: 0 });
  });
});
