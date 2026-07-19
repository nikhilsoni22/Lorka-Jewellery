import { UserRole, isAdminRole, type LoginResult } from '@lorka/types';
import type { UserEntity } from '../../common/interfaces/entities';
import type {
  IUserRepository,
  IRefreshTokenRepository,
} from '../../common/interfaces/repositories';
import type { IEmailService } from '../../common/interfaces/services';
import { AppError } from '../../common/errors/app-error';
import { hashPassword, verifyPassword } from '../../common/security/password';
import {
  signAccessToken,
  generateRefreshToken,
  generateResetToken,
  generateOtp,
  hashToken,
  accessTokenTtlSeconds,
} from '../../common/security/tokens';
import { env } from '../../config/env';
import { toPublicUser } from '../users/user.service';
import { AuditLogService, type AuditContext } from '../audit/audit-log.service';

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

/** Result of issuing a session: JSON body payload + the raw refresh token for the cookie. */
export interface SessionIssue {
  result: LoginResult;
  refresh: { token: string; expiresAt: Date };
}

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly email: IEmailService,
    private readonly audit: AuditLogService,
  ) {}

  async register(
    input: { name: string; email: string; password: string },
    ctx: RequestContext,
  ): Promise<SessionIssue> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw AppError.conflict('An account with this email already exists');

    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: UserRole.Customer,
    });

    await this.audit.record('auth.register', this.auditCtx(ctx, user.id));
    await this.issueEmailOtp(user);
    return this.issueSession(user, false, ctx);
  }

  async login(
    input: { email: string; password: string; rememberMe?: boolean },
    ctx: RequestContext,
  ): Promise<SessionIssue> {
    const user = await this.authenticate(input.email, input.password, ctx, 'auth.login');
    return this.issueSession(user, input.rememberMe ?? false, ctx);
  }

  async adminLogin(
    input: { email: string; password: string; rememberMe?: boolean },
    ctx: RequestContext,
  ): Promise<SessionIssue> {
    const user = await this.authenticate(input.email, input.password, ctx, 'auth.admin.login');
    if (!isAdminRole(user.role)) {
      await this.audit.record('auth.admin.login.failed', this.auditCtx(ctx, user.id, { reason: 'not_admin' }));
      throw AppError.forbidden('You do not have permission to access the admin panel');
    }
    await this.audit.record('auth.admin.login', this.auditCtx(ctx, user.id));
    return this.issueSession(user, input.rememberMe ?? false, ctx);
  }

  async refresh(rawToken: string | undefined, ctx: RequestContext): Promise<SessionIssue> {
    if (!rawToken) throw AppError.unauthorized('Refresh token missing');

    const now = new Date();
    const existing = await this.refreshTokens.findActiveByHash(hashToken(rawToken), now);
    if (!existing) throw AppError.unauthorized('Invalid or expired refresh token');

    const user = await this.users.findById(existing.userId);
    if (!user || user.isBlocked) throw AppError.unauthorized('Account is unavailable');

    // Rotate: issue a new token that inherits the original expiry (caps total session length),
    // then revoke the old one and link it to its replacement.
    const rawNew = generateRefreshToken();
    const newHash = hashToken(rawNew);
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: newHash,
      expiresAt: existing.expiresAt,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });
    await this.refreshTokens.revoke(existing.id, newHash);
    await this.audit.record('auth.refresh', this.auditCtx(ctx, user.id));

    return {
      result: this.buildLoginResult(user),
      refresh: { token: rawNew, expiresAt: existing.expiresAt },
    };
  }

  async logout(rawToken: string | undefined, ctx: RequestContext): Promise<void> {
    if (!rawToken) return;
    const existing = await this.refreshTokens.findActiveByHash(hashToken(rawToken), new Date());
    if (existing) {
      await this.refreshTokens.revoke(existing.id);
      await this.audit.record('auth.logout', this.auditCtx(ctx, existing.userId));
    }
  }

  async forgotPassword(email: string, ctx: RequestContext): Promise<void> {
    const user = await this.users.findByEmail(email);
    // Respond identically whether or not the account exists (no user enumeration).
    if (!user || user.isBlocked) return;

    const { raw, hash } = generateResetToken();
    const expiresAt = new Date(Date.now() + env.RESET_TOKEN_TTL_MIN * 60_000);
    await this.users.setResetToken(user.id, hash, expiresAt);

    const resetUrl = `${env.WEBSITE_URL}/reset-password?token=${raw}`;
    await this.email.sendPasswordReset(user.email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string, ctx: RequestContext): Promise<void> {
    const user = await this.users.findByValidResetToken(hashToken(token), new Date());
    if (!user) throw AppError.badRequest('Invalid or expired reset token');

    const passwordHash = await hashPassword(newPassword);
    await this.users.updatePasswordAndClearReset(user.id, passwordHash);
    // Revoke every existing session so the reset forces re-authentication everywhere.
    await this.refreshTokens.revokeAllForUser(user.id);
    await this.audit.record('auth.password.reset', this.auditCtx(ctx, user.id));
  }

  async verifyEmailOtp(userId: string, otp: string, ctx: RequestContext): Promise<void> {
    const verified = await this.users.consumeEmailOtpIfValid(userId, hashToken(otp), new Date());
    if (!verified) throw AppError.badRequest('Invalid or expired code');
    await this.audit.record('auth.email.verified', this.auditCtx(ctx, userId));
  }

  async resendEmailOtp(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.notFound('Account not found');
    if (user.emailVerified) throw AppError.badRequest('Email is already verified');
    await this.issueEmailOtp(user);
  }

  // --- helpers -------------------------------------------------------------

  private async issueEmailOtp(user: UserEntity): Promise<void> {
    const { code, hash } = generateOtp();
    const expiresAt = new Date(Date.now() + env.EMAIL_OTP_TTL_MIN * 60_000);
    await this.users.setEmailOtp(user.id, hash, expiresAt);
    await this.email.sendEmailVerificationOtp(user.email, code);
  }

  private async authenticate(
    email: string,
    password: string,
    ctx: RequestContext,
    action: 'auth.login' | 'auth.admin.login',
  ): Promise<UserEntity> {
    const user = await this.users.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      await this.audit.record(`${action}.failed` as const, this.auditCtx(ctx, user?.id, { email }));
      throw AppError.unauthorized('Invalid email or password');
    }
    if (user.isBlocked) throw AppError.forbidden('Your account has been blocked');
    return user;
  }

  private async issueSession(
    user: UserEntity,
    rememberMe: boolean,
    ctx: RequestContext,
  ): Promise<SessionIssue> {
    const days = rememberMe ? env.REFRESH_TOKEN_REMEMBER_TTL_DAYS : env.REFRESH_TOKEN_TTL_DAYS;
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    const rawRefresh = generateRefreshToken();

    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: hashToken(rawRefresh),
      expiresAt,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });

    return {
      result: this.buildLoginResult(user),
      refresh: { token: rawRefresh, expiresAt },
    };
  }

  private buildLoginResult(user: UserEntity): LoginResult {
    return {
      user: toPublicUser(user),
      accessToken: signAccessToken({ sub: user.id, role: user.role }),
      expiresIn: accessTokenTtlSeconds,
    };
  }

  private auditCtx(
    ctx: RequestContext,
    actorId?: string | null,
    meta?: Record<string, unknown>,
  ): AuditContext {
    return { actorId: actorId ?? null, ip: ctx.ip, userAgent: ctx.userAgent, meta };
  }
}
