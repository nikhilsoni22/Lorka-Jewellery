import type { UserEntity } from '../../common/interfaces/entities';
import type {
  CreateUserData,
  IUserRepository,
  UserFilter,
  PagedResult,
  Pagination,
} from '../../common/interfaces/repositories';
import { UserModel, type UserDocument } from './user.model';

function toEntity(doc: UserDocument): UserEntity {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role,
    isBlocked: doc.isBlocked,
    emailVerified: doc.emailVerified,
    resetTokenHash: doc.resetTokenHash,
    resetTokenExpires: doc.resetTokenExpires,
    otpHash: doc.otpHash,
    otpExpires: doc.otpExpires,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class UserRepository implements IUserRepository {
  async list(filter: UserFilter, pagination: Pagination): Promise<PagedResult<UserEntity>> {
    const query: Record<string, unknown> = {};
    if (filter.role) query.role = filter.role;
    if (filter.isBlocked !== undefined) query.isBlocked = filter.isBlocked;
    if (filter.search) {
      const regex = { $regex: filter.search, $options: 'i' };
      query.$or = [{ name: regex }, { email: regex }];
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [docs, total] = await Promise.all([
      UserModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .lean<UserDocument[]>()
        .exec(),
      UserModel.countDocuments(query).exec(),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async findById(id: string): Promise<UserEntity | null> {
    const doc = await UserModel.findById(id).lean<UserDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean<UserDocument>().exec();
    return doc ? toEntity(doc) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const doc = await UserModel.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      role: data.role,
      emailVerified: data.emailVerified ?? false,
    });
    return toEntity(doc.toObject() as UserDocument);
  }

  async setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { resetTokenHash: tokenHash, resetTokenExpires: expiresAt } },
    ).exec();
  }

  async findByValidResetToken(tokenHash: string, now: Date): Promise<UserEntity | null> {
    const doc = await UserModel.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpires: { $gt: now },
    })
      .lean<UserDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async updatePasswordAndClearReset(userId: string, passwordHash: string): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { passwordHash, resetTokenHash: null, resetTokenExpires: null } },
    ).exec();
  }

  async setEmailOtp(userId: string, otpHash: string, expiresAt: Date): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { otpHash, otpExpires: expiresAt } },
    ).exec();
  }

  async consumeEmailOtpIfValid(userId: string, otpHash: string, now: Date): Promise<boolean> {
    const result = await UserModel.updateOne(
      { _id: userId, otpHash, otpExpires: { $gt: now } },
      { $set: { emailVerified: true, otpHash: null, otpExpires: null } },
    ).exec();
    return result.modifiedCount > 0;
  }
}
