import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors/app-error';

const PRODUCTS_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'products');
fs.mkdirSync(PRODUCTS_UPLOAD_ROOT, { recursive: true });

const BANNERS_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'banners');
fs.mkdirSync(BANNERS_UPLOAD_ROOT, { recursive: true });

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  if (!EXTENSION_BY_MIME[file.mimetype]) {
    cb(AppError.badRequest('Only JPG, PNG, WEBP or GIF images are allowed'));
    return;
  }
  cb(null, true);
};

const productsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PRODUCTS_UPLOAD_ROOT),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXTENSION_BY_MIME[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: imageFileFilter,
});

const bannerUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, BANNERS_UPLOAD_ROOT),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXTENSION_BY_MIME[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: imageFileFilter,
});

/** Accepts up to 6 images under the `images` field; converts multer's own errors into AppError. */
export function productImagesUpload(req: Request, res: Response, next: NextFunction): void {
  productsUpload.array('images', 6)(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      next(AppError.badRequest(err.message));
      return;
    }
    next(err);
  });
}

/** Accepts a single image under the `image` field; converts multer's own errors into AppError. */
export function bannerImageUpload(req: Request, res: Response, next: NextFunction): void {
  bannerUpload.single('image')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      next(AppError.badRequest(err.message));
      return;
    }
    next(err);
  });
}
