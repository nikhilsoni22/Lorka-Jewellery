import { env } from './config/env';
import { logger } from './common/logger/logger';
import { connectDatabase, disconnectDatabase } from './config/db';
import { createApp, API_BASE_PATH } from './app';

async function bootstrap(): Promise<void> {
  await connectDatabase(env.MONGO_URI);

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      `Jewellery API listening on http://localhost:${env.PORT}${API_BASE_PATH} (docs at ${API_BASE_PATH}/docs)`,
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force-exit if graceful shutdown stalls.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
