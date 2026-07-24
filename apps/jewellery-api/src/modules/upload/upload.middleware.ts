import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../common/errors/app-error';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(AppError.badRequest('Only JPG, PNG, WEBP or GIF images are allowed'));
    return;
  }
  cb(null, true);
};

// Files are buffered in memory, not written to disk — the controller streams them straight to
// Cloudinary. The API's own disk is ephemeral on most hosts, so writing uploads there means
// they vanish on the next restart/redeploy.
const productsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: imageFileFilter,
});

const bannerUpload = multer({
  storage: multer.memoryStorage(),
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
