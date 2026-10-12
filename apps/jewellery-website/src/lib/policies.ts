import { ALLOWED_ORDER_CITIES, type PoliciesResponse, type StoreInfoResponse } from '@lorka/types';

export type PolicySlug = keyof PoliciesResponse;

export const POLICY_PAGES: { slug: PolicySlug; title: string; description: string }[] = [
  { slug: 'privacy', title: 'Privacy Policy', description: 'How Lorka Jewellers collects and uses your information.' },
  { slug: 'terms', title: 'Terms & Conditions', description: 'The terms for using the Lorka Jewellers website and placing orders.' },
  { slug: 'refund', title: 'Refund & Cancellation', description: 'Cancellations, returns and refunds at Lorka Jewellers.' },
  { slug: 'shipping', title: 'Shipping & Delivery', description: 'Where and how Lorka Jewellers delivers your order.' },
];

const cities = ALLOWED_ORDER_CITIES.join(' and ');

function contactLine(info: StoreInfoResponse): string {
  const parts = [info.email && `email ${info.email}`, info.phone && `call ${info.phone}`].filter(Boolean);
  return parts.length ? `${parts.join(' or ')}, or raise a ticket from your account` : 'raise a support ticket from your account';
}

/**
 * Starting text used until the admin writes their own in Admin → Settings → Policies. It's a
 * generic draft — the store owner should review it (and have it checked) before relying on it.
 * Format: blank line between paragraphs, "## " for headings, "- " for bullet points.
 */
export function defaultPolicy(slug: PolicySlug, info: StoreInfoResponse): string {
  const contact = contactLine(info);
  switch (slug) {
    case 'privacy':
      return `This policy explains what information Lorka Jewellers collects when you use this website, and how we use it.

## What we collect
- Your name, email address and phone number when you create an account or place an order.
- Your delivery address, and the map location if you choose to share it at checkout.
- Details of the orders you place and the support tickets you raise.

## How we use it
- To process, deliver and support your orders, including sending order and delivery updates.
- To respond to your questions and support tickets.
- To keep the website secure and prevent fraud.

## Payments
Online payments are processed by Razorpay. We never see or store your card, UPI or bank details.

## Cookies and local storage
We use your browser's storage to keep you signed in and to remember your cart, wishlist and recently viewed items. These stay on your device.

## Sharing
We share your details only with those who need them to fulfil your order — such as our delivery staff and payment processor — or where the law requires it. We do not sell your information.

## Your choices
You can ask us to view, correct or delete your personal information. To do so, ${contact}.`;

    case 'terms':
      return `By using this website or placing an order with Lorka Jewellers, you agree to these terms.

## Products and prices
Our prices are based on the current metal rate, the weight of each piece and its making charge, so they can change as metal rates move. The price shown when you place your order is the price you pay. Product photos are representative; handcrafted pieces can vary slightly.

## Orders
An order is confirmed once we accept it — you'll see its status on the Track Order page. We may decline or cancel an order (for example, if an item is unavailable or a price was shown in error); if you have already paid, we will refund you in full.

## Made-to-order pieces
Some pieces are made to order. We'll confirm the expected ready date after you order. These are crafted specially for you, so please see our Refund & Cancellation policy for how they are handled.

## Delivery area
We currently deliver only within ${cities}.

## Accounts
You're responsible for keeping your login details safe and for orders placed from your account.

## Content
All designs, photos and text on this website belong to Lorka Jewellers and may not be copied without permission.

## Contact
For any questions about these terms, ${contact}.`;

    case 'refund':
      return `We want you to love your jewellery. If something isn't right, we'll help.

## Cancelling an order
You can ask to cancel an order any time before it is shipped. If you paid online, the full amount is refunded to your original payment method.

## Damaged or incorrect items
If your order arrives damaged, or isn't what you ordered, contact us within 48 hours of delivery with photos of the item and packaging, and we'll arrange a replacement or refund.

## Made-to-order pieces
Made-to-order pieces are crafted specially for you, so they can't be returned or cancelled once production has started — unless they arrive damaged or not as ordered.

## Refund timeline
Approved refunds are sent back to your original payment method. Your bank usually takes 5–7 working days to show the money in your account. Cash on delivery orders are refunded by bank transfer or UPI.

## How to reach us
To cancel an order or report a problem, ${contact}. Please keep your order number handy.`;

    case 'shipping':
      return `## Where we deliver
We currently deliver only within ${cities}. We're working on reaching more cities soon.

## Delivery time
In-stock pieces are prepared and dispatched as soon as your order is confirmed. Made-to-order pieces are crafted after you order — we'll email you the expected ready date.

## Tracking your order
You can follow your order live on the Track Order page — from Order Placed to Confirmed, Shipped and Delivered. We also email you at each step.

## Delivery charges
Any delivery or handling charges are shown clearly at checkout before you pay.

## Questions
For any delivery question, ${contact}.`;
  }
}

/** Splits policy text into blocks for rendering. */
export type PolicyBlock = { type: 'heading' | 'paragraph'; text: string } | { type: 'list'; items: string[] };

export function parsePolicy(text: string): PolicyBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk): PolicyBlock[] => {
      const lines = chunk.split('\n').map((l) => l.trim());
      const blocks: PolicyBlock[] = [];
      let paragraph: string[] = [];
      let list: string[] = [];
      const flush = () => {
        if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
        if (list.length) blocks.push({ type: 'list', items: list });
        paragraph = [];
        list = [];
      };
      for (const line of lines) {
        if (line.startsWith('## ')) {
          flush();
          blocks.push({ type: 'heading', text: line.slice(3) });
        } else if (line.startsWith('- ')) {
          if (paragraph.length) flush();
          list.push(line.slice(2));
        } else {
          if (list.length) flush();
          paragraph.push(line);
        }
      }
      flush();
      return blocks;
    });
}
