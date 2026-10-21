import crypto from 'node:crypto';
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
import { OrderModel } from '../../src/modules/order/order.model';
import { SettingsModel } from '../../src/modules/settings/settings.model';
import { UserModel } from '../../src/modules/users/user.model';
import { PendingCheckoutRepository } from '../../src/modules/payment/pending-checkout.repository';

const base = API_BASE_PATH;
const WEBHOOK_SECRET = 'whsec_test_secret_value';
let mongod: MongoMemoryServer;
let app: Express;
let adminToken: string;
let customerToken: string;
let customerId: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await OrderModel.syncIndexes();
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
  const user = await UserModel.create({ name: 'Asha Verma', email: 'asha@example.com', passwordHash: 'x' });
  customerId = user._id.toString();
  customerToken = signAccessToken({ sub: customerId, role: UserRole.Customer });
  await SettingsModel.create({ silverRatePerKg: 100000, razorpayWebhookSecret: WEBHOOK_SECRET });
});

/** Silver at ₹100/g: 10g + ₹200 making = ₹1200. */
async function seedProduct(stock = 5) {
  const category = await CategoryModel.create({ name: 'Rings', slug: 'rings' });
  const product = await ProductModel.create({
    name: 'Classic Silver Ring',
    slug: 'classic-silver-ring',
    sku: 'RNG-001',
    category: category._id,
    metalType: 'silver',
    makingCharge: 200,
    weight: 10,
    images: ['https://example.com/ring.jpg'],
    stock,
  });
  return product._id.toString();
}

function checkout(productId: string, extra: Record<string, unknown> = {}) {
  return {
    customerName: 'Asha Verma',
    customerPhone: '9876543210',
    shippingAddress: { line1: '12 Main Road', city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001' },
    items: [{ productId, quantity: 1 }],
    ...extra,
  };
}

describe('coupons', () => {
  it('applies a valid coupon to the order and counts the use', async () => {
    const productId = await seedProduct();
    await request(app)
      .post(`${base}/coupons`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'diwali10', type: 'percentage', value: 10, usageLimit: 1 })
      .expect(201);

    const check = await request(app).post(`${base}/coupons/validate`).send({ code: 'DIWALI10', subtotal: 1200 });
    expect(check.body.data.discount).toBe(120);

    const res = await request(app)
      .post(`${base}/orders`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(checkout(productId, { couponCode: 'diwali10', paymentMethod: 'cod' }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subtotal: 1200, discount: 120, total: 1080, couponCode: 'DIWALI10' });

    // usageLimit 1 is now used up.
    const second = await request(app)
      .post(`${base}/orders`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(checkout(productId, { couponCode: 'DIWALI10', paymentMethod: 'cod' }));
    expect(second.status).toBe(400);
  });

  it('rejects an order below the minimum amount', async () => {
    const productId = await seedProduct();
    await request(app)
      .post(`${base}/coupons`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'BIG500', type: 'flat', value: 500, minOrderAmount: 5000 })
      .expect(201);

    const res = await request(app)
      .post(`${base}/orders`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(checkout(productId, { couponCode: 'BIG500' }));
    expect(res.status).toBe(400);
  });
});

describe('Razorpay webhook', () => {
  function signedWebhook(body: object) {
    const raw = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
    return request(app)
      .post(`${base}/payments/razorpay/webhook`)
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', signature)
      .send(raw);
  }

  const captured = (orderId: string) => ({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_123', order_id: orderId, amount: 120000, status: 'captured' } } },
  });

  it('creates the order for a captured payment exactly once, with gift details', async () => {
    const productId = await seedProduct();
    await new PendingCheckoutRepository().create({
      razorpayOrderId: 'order_abc',
      userId: customerId,
      input: {
        ...checkout(productId),
        shippingAddress: { line1: '12 Main Road', line2: '', city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001', country: 'India' },
        items: [{ productId, quantity: 1, isBuildOrder: false }],
        notes: '',
        giftWrap: true,
        giftMessage: 'Happy birthday!',
      },
      amountPaise: 120000,
    });

    await signedWebhook(captured('order_abc')).expect(200);
    // Razorpay retries webhooks — a repeat must not create a second order.
    await signedWebhook(captured('order_abc')).expect(200);

    const orders = await OrderModel.find({ razorpayOrderId: 'order_abc' }).lean();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ paymentStatus: 'paid', giftWrap: true, giftMessage: 'Happy birthday!', total: 1200 });
    expect((await ProductModel.findById(productId).lean())?.soldCount).toBe(1);
  });

  it('rejects a webhook with a bad signature', async () => {
    await request(app)
      .post(`${base}/payments/razorpay/webhook`)
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', 'deadbeef')
      .send(JSON.stringify(captured('order_abc')))
      .expect(400);
  });
});

describe('reviews', () => {
  it('lets a customer review once and keeps the product rating in sync', async () => {
    const productId = await seedProduct();
    await OrderModel.create({
      orderNumber: 'ORD-1',
      userId: customerId,
      status: OrderStatus.Delivered,
      customerName: 'Asha Verma',
      customerPhone: '9876543210',
      shippingAddress: { line1: 'x', city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001' },
      items: [{ productId, name: 'Ring', unitPrice: 1200, quantity: 1, subtotal: 1200 }],
      subtotal: 1200,
      total: 1200,
    });

    const res = await request(app)
      .post(`${base}/reviews/product/${productId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4, comment: 'Lovely finish' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ verifiedBuyer: true, userName: 'Asha V.' });

    await request(app)
      .post(`${base}/reviews/product/${productId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 5, comment: 'Again' })
      .expect(409);

    const list = await request(app).get(`${base}/reviews/product/${productId}`);
    expect(list.body.data.summary).toMatchObject({ average: 4, count: 1 });
    expect((await ProductModel.findById(productId).lean())).toMatchObject({ ratingAvg: 4, ratingCount: 1 });

    // Hiding the review removes it from the rating.
    await request(app)
      .patch(`${base}/reviews/${res.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVisible: false })
      .expect(200);
    expect((await ProductModel.findById(productId).lean())).toMatchObject({ ratingAvg: 0, ratingCount: 0 });
  });
});

describe('product filters', () => {
  it('filters by live price range and reports the price breakup', async () => {
    await seedProduct();
    const inRange = await request(app).get(`${base}/products?minPrice=1000&maxPrice=1500`);
    expect(inRange.body.data).toHaveLength(1);
    expect(inRange.body.data[0].priceBreakup).toMatchObject({ metalRatePerGram: 100, metalValue: 1000, makingCharge: 200 });

    const outOfRange = await request(app).get(`${base}/products?minPrice=2000`);
    expect(outOfRange.body.data).toHaveLength(0);
  });
});

describe('COD fee and prepaid discount', () => {
  it('charges COD orders more and prepaid (UPI) orders less, as set by the admin', async () => {
    await SettingsModel.updateOne(
      {},
      {
        paymentMethods: { onlineEnabled: false, codEnabled: true, upiEnabled: true, upiId: 'lorka@okaxis' },
        paymentPricing: {
          codFee: { type: 'fixed', value: 49 },
          prepaidDiscount: { type: 'percentage', value: 5, maxAmount: 300 },
        },
      },
    );
    const productId = await seedProduct();
    const auth = { Authorization: `Bearer ${customerToken}` };

    const settings = await request(app).get(`${base}/settings`);
    expect(settings.body.data.paymentPricing.codFee).toMatchObject({ type: 'fixed', value: 49 });

    const cod = await request(app).post(`${base}/orders`).set(auth).send(checkout(productId, { paymentMethod: 'cod' }));
    expect(cod.body.data).toMatchObject({ subtotal: 1200, prepaidDiscount: 0, total: 1249 });
    expect(cod.body.data.charges).toContainEqual({ name: 'COD charges', amount: 49 });

    const upi = await request(app).post(`${base}/orders`).set(auth).send(checkout(productId, { paymentMethod: 'upi' }));
    expect(upi.body.data).toMatchObject({ subtotal: 1200, prepaidDiscount: 60, total: 1140 });
    expect(upi.body.data.charges).toEqual([]);
  });
});
