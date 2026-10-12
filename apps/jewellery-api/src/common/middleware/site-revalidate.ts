import type { Request, Response, NextFunction } from 'express';
import { env, isTest } from '../../config/env';
import { logger } from '../logger/logger';

/** Writes under these API paths change something the website shows (catalog, prices, stock, ratings). */
const WATCHED = /^\/api\/v1\/(products|categories|banners|settings|reviews|orders|payments)(\/|$|\?)/;
/** …except these, which only start a payment or upload a photo — nothing on the site changes yet. */
const IGNORED = /^\/api\/v1\/(payments\/razorpay\/order|reviews\/images)(\/|$|\?)/;
const DEBOUNCE_MS = 2_000;

let timer: NodeJS.Timeout | undefined;

async function revalidateWebsite(): Promise<void> {
  try {
    const res = await fetch(`${env.WEBSITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'x-internal-key': env.INTERNAL_API_KEY! },
    });
    if (!res.ok) logger.warn({ status: res.status }, '[revalidate] Website refused the cache refresh');
  } catch (err) {
    logger.warn({ err }, '[revalidate] Could not reach the website to refresh its cache');
  }
}

/**
 * The website caches API responses for a minute. After any successful write that affects what
 * shoppers see, ask it to drop that cache so admin changes show up straight away. Debounced, so a
 * burst of edits (e.g. saving several products) triggers a single refresh.
 */
export function siteRevalidate(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || !env.INTERNAL_API_KEY || isTest) {
    next();
    return;
  }
  res.on('finish', () => {
    if (res.statusCode >= 400 || !WATCHED.test(req.originalUrl) || IGNORED.test(req.originalUrl)) return;
    clearTimeout(timer);
    timer = setTimeout(() => void revalidateWebsite(), DEBOUNCE_MS);
    timer.unref();
  });
  next();
}
