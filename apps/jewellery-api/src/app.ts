import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { logger } from './common/logger/logger';
import { globalLimiter } from './common/middleware/rate-limit';
import { notFound } from './common/middleware/not-found';
import { errorHandler } from './common/middleware/error-handler';
import { createApiRouter } from './routes';
import { mountSwagger } from './docs/swagger';
import { buildContainer, type AppContainer } from './container/container';

export const API_BASE_PATH = '/api/v1';

export function createApp(container: AppContainer = buildContainer()): Express {
  const app = express();

  // Behind a proxy (Render/Railway/Vercel) so req.ip and secure cookies work.
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== 'test' }));
  app.use(globalLimiter);

  // Uploaded product images (served from public/uploads/products by the multer disk storage).
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  mountSwagger(app, API_BASE_PATH);
  app.use(API_BASE_PATH, createApiRouter(container));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
