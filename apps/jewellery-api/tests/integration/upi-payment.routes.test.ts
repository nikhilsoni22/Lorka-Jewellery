import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Express } from 'express';
import { UserRole } from '@lorka/types';
import { createApp, API_BASE_PATH } from '../../src/app';
import { buildContainer, type AppContainer } from '../../src/container/container';
import { signAccessToken } from '../../src/common/security/tokens';
import { CategoryModel } from '../../src/modules/category/category.model';
import { ProductModel } from '../../src/modules/product/product.model';
import { OrderModel } from '../../src/modules/order/order.model';
import { SettingsModel } from '../../src/modules/settings/settings.model';
import { UserModel } from '../../src/modules/users/user.model';
import { ConsoleEmailService } from '../../src/notifications/console-email.service';

const base = API_BASE_PATH;
const PHONE = '9876543210';
let mongod: MongoMemoryServer;
let app: Express;
let container: AppContainer;
let adminToken: string;
let customerToken: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await OrderModel.syncIndexes();
  container = buildContainer();
  app = createApp(container);
  adminToken = signAccessToken({ sub: '65f0c0c0c0c0c0c0c0c0c001', role: UserRole.SuperAdmin });
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  vi.restoreAllMocks();
  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  }
  const user = await UserModel.create({ name: 'Asha Verma', email: 'asha@example.com', passwordHash: 'x' });
  customerToken = signAccessToken({ sub: user._id.toString(), role: UserRole.Customer });
  await SettingsModel.create({
    silverRatePerKg: 100000,
    notificationEmail: 'owner@example.com',
    paymentMethods: { onlineEnabled: false, codEnabled: true, upiEnabled: true, upiId: 'lorka@okaxis', upiPayeeName: 'Lorka' },
  });
});

/** Silver at ₹100/g: 10g + ₹200 making = ₹1200. Pass a product id to order the same product again. */
async function placeUpiOrder(existingProductId?: string) {
  const productId = existingProductId ?? (await seedProduct());
  const res = await request(app)
    .post(`${base}/orders`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      customerName: 'Asha Verma',
      customerPhone: PHONE,
      shippingAddress: { line1: '12 Main Road', city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001' },
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'upi',
    });
  expect(res.status).toBe(201);
  return { ...(res.body.data as { id: string; orderNumber: string; upiPaymentDueAt?: string }), productId };
}

async function seedProduct() {
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
    stock: 5,
  });
  return product._id.toString();
}

const submitUtr = (orderNumber: string, upiReference: string) =>
  request(app).post(`${base}/orders/upi-payment`).send({ orderNumber, phone: PHONE, upiReference });

/** "I have paid" with no UTR. */
const claimPaid = (orderNumber: string) =>
  request(app).post(`${base}/orders/upi-payment`).send({ orderNumber, phone: PHONE, upiReference: '' });

const review = (id: string, body: object) =>
  request(app).patch(`${base}/orders/${id}/payment`).set('Authorization', `Bearer ${adminToken}`).send(body);

describe('UPI payments', () => {
  it('places an unpaid UPI order, takes the UTR, and emails the customer once the admin verifies', async () => {
    const adminAlert = vi.spyOn(ConsoleEmailService.prototype, 'sendAdminUpiPaymentSubmitted');
    const verifiedEmail = vi.spyOn(ConsoleEmailService.prototype, 'sendPaymentVerified');
    const order = await placeUpiOrder();
    expect(await OrderModel.findById(order.id).lean()).toMatchObject({ paymentMethod: 'upi', paymentStatus: 'pending', total: 1200 });

    const submitted = await submitUtr(order.orderNumber, ' 412345678901 ');
    expect(submitted.status).toBe(200);
    expect(submitted.body.data).toMatchObject({ upiReference: '412345678901', paymentStatus: 'pending' });
    expect(adminAlert).toHaveBeenCalledWith('owner@example.com', expect.objectContaining({ upiReference: '412345678901' }));

    const verified = await review(order.id, { action: 'verify' });
    expect(verified.status).toBe(200);
    expect(verified.body.data.paymentStatus).toBe('paid');
    expect(verified.body.data.paymentVerifiedAt).toBeTruthy();
    await vi.waitFor(() =>
      expect(verifiedEmail).toHaveBeenCalledWith('asha@example.com', expect.objectContaining({ orderNumber: order.orderNumber })),
    );

    // Verified payments are final: no second verify, and the UTR can't be changed any more.
    expect((await review(order.id, { action: 'verify' })).status).toBe(409);
    expect((await submitUtr(order.orderNumber, '499999999999')).status).toBe(400);
  });

  it('lets the customer fix the UTR after a rejection, and emails the reason', async () => {
    const rejectedEmail = vi.spyOn(ConsoleEmailService.prototype, 'sendPaymentRejected');
    const order = await placeUpiOrder();
    await submitUtr(order.orderNumber, '412345678901').expect(200);

    const rejected = await review(order.id, { action: 'reject', reason: 'No credit with this UTR' });
    expect(rejected.body.data.paymentStatus).toBe('failed');
    await vi.waitFor(() =>
      expect(rejectedEmail).toHaveBeenCalledWith('asha@example.com', expect.anything(), 'No credit with this UTR'),
    );

    const resubmitted = await submitUtr(order.orderNumber, '412345678902');
    expect(resubmitted.body.data).toMatchObject({ upiReference: '412345678902', paymentStatus: 'pending' });
  });

  it('accepts "I have paid" without a UTR, and asks for the UTR only after a rejection', async () => {
    const adminAlert = vi.spyOn(ConsoleEmailService.prototype, 'sendAdminUpiPaymentSubmitted');
    const order = await placeUpiOrder();

    const claimed = await claimPaid(order.orderNumber);
    expect(claimed.status).toBe(200);
    expect(claimed.body.data).toMatchObject({ paymentStatus: 'pending' });
    expect(claimed.body.data.upiSubmittedAt).toBeTruthy();
    expect(claimed.body.data.upiReference).toBeUndefined();
    expect(adminAlert).toHaveBeenCalledTimes(1);

    // Tapping the button again doesn't re-alert the admin.
    await claimPaid(order.orderNumber).expect(200);
    expect(adminAlert).toHaveBeenCalledTimes(1);

    // Admin can't find the payment by its note and amount → the customer must now give the UTR.
    await review(order.id, { action: 'reject' }).expect(200);
    expect((await claimPaid(order.orderNumber)).status).toBe(400);
    const withUtr = await submitUtr(order.orderNumber, '412345678901');
    expect(withUtr.body.data).toMatchObject({ upiReference: '412345678901', paymentStatus: 'pending' });
    expect(adminAlert).toHaveBeenCalledTimes(2);
  });

  it('refuses a UTR that already paid for another order', async () => {
    const first = await placeUpiOrder();
    await submitUtr(first.orderNumber, '412345678901').expect(200);
    const second = await placeUpiOrder(first.productId);
    expect((await submitUtr(second.orderNumber, '412345678901')).status).toBe(409);
  });

  it('rejects UPI orders while UPI is turned off, and manual verification of non-UPI orders', async () => {
    await SettingsModel.updateOne({}, { 'paymentMethods.upiEnabled': false });
    const category = await CategoryModel.create({ name: 'Rings', slug: 'rings' });
    const product = await ProductModel.create({
      name: 'Ring',
      slug: 'ring',
      sku: 'RNG-002',
      category: category._id,
      metalType: 'silver',
      makingCharge: 200,
      weight: 10,
      stock: 5,
    });
    const body = {
      customerName: 'Asha Verma',
      customerPhone: PHONE,
      shippingAddress: { line1: '12 Main Road', city: 'Jodhpur', state: 'Rajasthan', postalCode: '342001' },
      items: [{ productId: product._id.toString(), quantity: 1 }],
    };
    const upi = await request(app).post(`${base}/orders`).set('Authorization', `Bearer ${customerToken}`).send({ ...body, paymentMethod: 'upi' });
    expect(upi.status).toBe(400);

    const cod = await request(app).post(`${base}/orders`).set('Authorization', `Bearer ${customerToken}`).send({ ...body, paymentMethod: 'cod' });
    expect((await review(cod.body.data.id, { action: 'verify' })).status).toBe(400);
  });

  it('auto-cancels unpaid UPI orders after the payment window, but never ones the customer says they paid', async () => {
    const cancelledEmail = vi.spyOn(ConsoleEmailService.prototype, 'sendUnpaidOrderCancelled');
    const unpaid = await placeUpiOrder();
    const hoursLeft = (new Date(unpaid.upiPaymentDueAt!).getTime() - Date.now()) / 3_600_000;
    expect(hoursLeft).toBeGreaterThan(23.9);
    expect(hoursLeft).toBeLessThanOrEqual(24);
    const submitted = await placeUpiOrder(unpaid.productId);
    await submitUtr(submitted.orderNumber, '412345678901').expect(200);
    const claimed = await placeUpiOrder(unpaid.productId);
    await claimPaid(claimed.orderNumber).expect(200);
    expect((await ProductModel.findById(unpaid.productId).lean())?.stock).toBe(2);

    // Not due yet: nothing happens.
    expect(await container.orderService.cancelOverdueUpiOrders()).toBe(0);

    await OrderModel.updateMany({}, { upiPaymentDueAt: new Date(Date.now() - 60_000) });
    expect(await container.orderService.cancelOverdueUpiOrders()).toBe(1);
    expect(await container.orderService.cancelOverdueUpiOrders()).toBe(0);

    expect(await OrderModel.findById(unpaid.id).lean()).toMatchObject({ status: 'cancelled' });
    expect(await OrderModel.findById(submitted.id).lean()).toMatchObject({ status: 'pending', paymentStatus: 'pending' });
    expect(await OrderModel.findById(claimed.id).lean()).toMatchObject({ status: 'pending', paymentStatus: 'pending' });
    expect((await ProductModel.findById(unpaid.productId).lean())?.stock).toBe(3);
    await vi.waitFor(() =>
      expect(cancelledEmail).toHaveBeenCalledWith('asha@example.com', expect.objectContaining({ orderNumber: unpaid.orderNumber })),
    );
    // Too late to pay a cancelled order.
    expect((await submitUtr(unpaid.orderNumber, '412345678999')).status).toBe(400);
  });

  it('requires a UPI ID before UPI can be switched on in settings', async () => {
    const res = await request(app)
      .put(`${base}/settings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        silverRatePerKg: 100000,
        goldRatePer10g: 0,
        charges: [],
        maintenance: {},
        paymentMethods: { onlineEnabled: false, codEnabled: true, upiEnabled: true, upiId: '' },
      });
    expect(res.status).toBe(400);
  });
});
