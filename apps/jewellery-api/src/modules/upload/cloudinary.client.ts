import crypto from 'node:crypto';
import { env } from '../../config/env';
import { logger } from '../../common/logger/logger';
import { AppError } from '../../common/errors/app-error';

function signParams(params: Record<string, string>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest('hex');
}

/** Uploads an image buffer to Cloudinary and returns its permanent, publicly-addressable URL —
 * unlike the local disk, this survives host restarts and redeploys. */
export async function uploadImageToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signParams({ folder, timestamp });

  const form = new FormData();
  form.append('file', new Blob([buffer]));
  form.append('api_key', env.CLOUDINARY_API_KEY);
  form.append('timestamp', timestamp);
  form.append('folder', folder);
  form.append('signature', signature);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
  } catch (err) {
    logger.error({ err }, 'Cloudinary upload request failed');
    throw AppError.internal('Unable to upload image. Please try again.');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error({ status: res.status, body }, 'Cloudinary upload returned an error');
    throw AppError.internal('Unable to upload image. Please try again.');
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
