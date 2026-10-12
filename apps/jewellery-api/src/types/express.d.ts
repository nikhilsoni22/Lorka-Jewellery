import type { UserRole } from '@lorka/types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      /** Exact bytes of a JSON body, kept for webhook signature checks (see app.ts). */
      rawBody?: Buffer;
    }
  }
}

export {};
