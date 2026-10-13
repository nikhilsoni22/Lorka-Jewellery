import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { IGoogleTokenVerifier, VerifiedGoogleIdentity } from '../../common/interfaces/services';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../common/logger/logger';

// Google's public signing keys for Firebase Auth ID tokens. `createRemoteJWKSet` caches them and
// refetches on key rotation, so this costs one HTTPS call per few hours, not per login.
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/**
 * Verifies Firebase ID tokens the way the Firebase Admin SDK does (signature, issuer, audience,
 * expiry), without needing a service-account key — only the public project ID.
 */
export class FirebaseTokenVerifier implements IGoogleTokenVerifier {
  constructor(private readonly projectId: string) {}

  async verify(idToken: string): Promise<VerifiedGoogleIdentity> {
    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
        issuer: `https://securetoken.google.com/${this.projectId}`,
        audience: this.projectId,
        algorithms: ['RS256'],
      }));
    } catch (err) {
      logger.warn({ err }, '[auth] Rejected Google sign-in token');
      throw AppError.unauthorized('Google sign-in failed or expired. Please try again.');
    }

    const firebase = payload.firebase as { sign_in_provider?: string } | undefined;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    if (!payload.sub || !email || firebase?.sign_in_provider !== 'google.com') {
      throw AppError.unauthorized('Google sign-in failed. Please try again.');
    }
    if (payload.email_verified !== true) {
      throw AppError.unauthorized('Your Google email address is not verified.');
    }

    return {
      uid: payload.sub,
      email: email.toLowerCase(),
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  }
}
