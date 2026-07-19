import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/response/api-response';
import { AppError } from '../../common/errors/app-error';
import { isProd } from '../../config/env';
import { env } from '../../config/env';
import type { AuthService, RequestContext, SessionIssue } from './auth.service';
import type { UserService } from '../users/user.service';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UserService,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const issued = await this.auth.register(req.body, this.ctx(req));
    this.respondWithSession(res, issued, 201);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const issued = await this.auth.login(req.body, this.ctx(req));
    this.respondWithSession(res, issued);
  };

  adminLogin = async (req: Request, res: Response): Promise<void> => {
    const issued = await this.auth.adminLogin(req.body, this.ctx(req));
    this.respondWithSession(res, issued);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const token = this.readRefreshToken(req);
    const issued = await this.auth.refresh(token, this.ctx(req));
    this.respondWithSession(res, issued);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.auth.logout(this.readRefreshToken(req), this.ctx(req));
    this.clearRefreshCookie(res);
    sendSuccess(res, { loggedOut: true }, 200, 'Logged out');
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    const user = await this.users.getPublicById(req.user.id);
    sendSuccess(res, { user });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await this.auth.forgotPassword(req.body.email, this.ctx(req));
    sendSuccess(res, { requested: true }, 200, 'If the account exists, a reset link has been sent');
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this.auth.resetPassword(req.body.token, req.body.password, this.ctx(req));
    sendSuccess(res, { reset: true }, 200, 'Password updated. Please log in again.');
  };

  verifyEmailOtp = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    await this.auth.verifyEmailOtp(req.user.id, req.body.otp, this.ctx(req));
    sendSuccess(res, { verified: true }, 200, 'Email verified');
  };

  resendEmailOtp = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized();
    await this.auth.resendEmailOtp(req.user.id);
    sendSuccess(res, { sent: true }, 200, 'A new code has been sent to your email');
  };

  // --- Deferred providers (wired when credentials are provided) -------------

  googleStub = async (): Promise<void> => {
    throw AppError.notImplemented('Google login is not enabled yet');
  };

  otpRequestStub = async (): Promise<void> => {
    throw AppError.notImplemented('OTP login is not enabled yet');
  };

  otpVerifyStub = async (): Promise<void> => {
    throw AppError.notImplemented('OTP login is not enabled yet');
  };

  // --- helpers -------------------------------------------------------------

  private respondWithSession(res: Response, issued: SessionIssue, status = 200): void {
    this.setRefreshCookie(res, issued.refresh.token, issued.refresh.expiresAt);
    sendSuccess(res, issued.result, status);
  }

  private ctx(req: Request): RequestContext {
    return { ip: req.ip, userAgent: req.get('user-agent') ?? undefined };
  }

  private readRefreshToken(req: Request): string | undefined {
    return req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: COOKIE_PATH,
      domain: env.COOKIE_DOMAIN,
      expires: expiresAt,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: COOKIE_PATH,
      domain: env.COOKIE_DOMAIN,
    });
  }
}
