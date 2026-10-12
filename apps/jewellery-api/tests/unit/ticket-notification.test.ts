import { describe, it, expect } from 'vitest';
import { TicketStatus } from '@lorka/types';
import type { TicketResponse } from '@lorka/types';
import { adminTicketNotificationEmail } from '../../src/notifications/email-templates';

const ticket: TicketResponse = {
  id: 't1',
  subject: 'Ring size issue',
  message: 'The ring is too small <script>alert(1)</script>',
  status: TicketStatus.Open,
  customerName: 'Asha Verma',
  customerEmail: 'asha@example.com',
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
};

describe('adminTicketNotificationEmail', () => {
  it('includes the message and the customer name, phone and address', () => {
    const { subject, html } = adminTicketNotificationEmail({
      ticket,
      customerPhone: '9876543210',
      shippingAddress: {
        line1: '12 Main Road',
        city: 'Jodhpur',
        state: 'Rajasthan',
        postalCode: '342001',
        country: 'India',
      },
      latestOrderNumber: 'ORD-20261010-ABCDE',
    });

    expect(subject).toContain('Ring size issue');
    expect(html).toContain('Asha Verma');
    expect(html).toContain('9876543210');
    expect(html).toContain('12 Main Road');
    expect(html).toContain('Jodhpur');
    expect(html).toContain('ORD-20261010-ABCDE');
  });

  it('escapes customer-written text so it cannot inject HTML', () => {
    const { html } = adminTicketNotificationEmail({ ticket });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('says when phone and address are not on file', () => {
    const { html } = adminTicketNotificationEmail({ ticket });
    expect(html).toContain('Not on file');
  });
});
