import { env } from '../src/config/env';
import { logger } from '../src/common/logger/logger';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { hashPassword } from '../src/common/security/password';
import { UserModel } from '../src/modules/users/user.model';
import { UserRole } from '@lorka/types';

async function seedAdmin(): Promise<void> {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    logger.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment');
    process.exit(1);
  }

  await connectDatabase(env.MONGO_URI);

  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const existing = await UserModel.findOne({ email }).exec();

  if (existing) {
    // Ensure the account is a super-admin and reset its password to the seed value.
    existing.role = UserRole.SuperAdmin;
    existing.passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
    existing.isBlocked = false;
    existing.emailVerified = true;
    await existing.save();
    logger.info({ email }, 'Existing account promoted to super-admin and password reset');
  } else {
    await UserModel.create({
      name: env.SEED_ADMIN_NAME,
      email,
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      role: UserRole.SuperAdmin,
      emailVerified: true,
    });
    logger.info({ email }, 'Super-admin created');
  }

  await disconnectDatabase();
  process.exit(0);
}

seedAdmin().catch((err) => {
  logger.error({ err }, 'Failed to seed admin');
  process.exit(1);
});
