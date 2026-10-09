import type { RefreshTokenEntity } from '../../common/interfaces/entities';
import type {
  CreateRefreshTokenData,
  IRefreshTokenRepository,
} from '../../common/interfaces/repositories';
import { RefreshTokenModel, type RefreshTokenDocument } from './refresh-token.model';

function toEntity(doc: RefreshTokenDocument): RefreshTokenEntity {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt,
    replacedByTokenHash: doc.replacedByTokenHash,
    userAgent: doc.userAgent ?? undefined,
    ip: doc.ip ?? undefined,
    createdAt: doc.createdAt,
  };
}

const ROTATION_GRACE_MS = 30_000;

export class RefreshTokenRepository implements IRefreshTokenRepository {
  async create(data: CreateRefreshTokenData): Promise<RefreshTokenEntity> {
    const doc = await RefreshTokenModel.create(data);
    return toEntity(doc.toObject() as RefreshTokenDocument);
  }

  async findActiveByHash(tokenHash: string, now: Date): Promise<RefreshTokenEntity | null> {
    // A token rotated a moment ago is still accepted for a short grace window: several tabs or
    // parallel requests refresh with the same cookie at once, and without this the losers of the
    // race get "invalid token" and the admin is logged out.
    const graceCutoff = new Date(now.getTime() - ROTATION_GRACE_MS);
    const doc = await RefreshTokenModel.findOne({
      tokenHash,
      $or: [{ revokedAt: null }, { revokedAt: { $gt: graceCutoff } }],
      expiresAt: { $gt: now },
    })
      .lean<RefreshTokenDocument>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async revoke(id: string, replacedByTokenHash?: string): Promise<void> {
    await RefreshTokenModel.updateOne(
      { _id: id },
      { $set: { revokedAt: new Date(), replacedByTokenHash: replacedByTokenHash ?? null } },
    ).exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  }
}
