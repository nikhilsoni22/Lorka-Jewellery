import type { z } from 'zod';
import type { UserRole } from './enums';
import type {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailOtpSchema,
  googleLoginSchema,
} from './auth.schemas';

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

/** Public representation of a user (never includes password/token hashes). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

export interface LoginResult extends AuthTokens {
  user: PublicUser;
}

/**
 * `/auth/google` either signs the customer in, or — for an email we've never seen — asks for
 * their name first (no account is created until they confirm it).
 */
export type GoogleLoginResponse =
  | ({ status: 'authenticated'; isNewUser: boolean } & LoginResult)
  | { status: 'needs_name'; email: string; suggestedName: string };
