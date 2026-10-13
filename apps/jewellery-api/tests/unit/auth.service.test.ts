import { describe, it, expect, beforeEach } from 'vitest';
import { UserRole } from '@lorka/types';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AuditLogService } from '../../src/modules/audit/audit-log.service';
import { hashPassword } from '../../src/common/security/password';
import {
  FakeUserRepository,
  FakeRefreshTokenRepository,
  FakeAuditLogRepository,
  FakeEmailService,
} from '../helpers/fakes';

const ctx = { ip: '127.0.0.1', userAgent: 'vitest' };

let users: FakeUserRepository;
let refresh: FakeRefreshTokenRepository;
let email: FakeEmailService;
let service: AuthService;

async function seedAdmin(role: UserRole = UserRole.Admin) {
  return users.create({
    name: 'Admin',
    email: 'admin@lorka.com',
    passwordHash: await hashPassword('Admin@12345'),
    role,
    emailVerified: true,
  });
}

beforeEach(() => {
  users = new FakeUserRepository();
  refresh = new FakeRefreshTokenRepository();
  email = new FakeEmailService();
  service = new AuthService(users, refresh, email, new AuditLogService(new FakeAuditLogRepository()));
});

describe('AuthService.register', () => {
  it('creates a customer and issues a session', async () => {
    const { result, refresh: cookie } = await service.register(
      { name: 'Jane', email: 'jane@example.com', password: 'Secret123' },
      ctx,
    );
    expect(result.user.email).toBe('jane@example.com');
    expect(result.user.role).toBe(UserRole.Customer);
    expect(result.accessToken).toBeTruthy();
    expect(cookie.token).toBeTruthy();
  });

  it('rejects a duplicate email with 409', async () => {
    await service.register({ name: 'Jane', email: 'jane@example.com', password: 'Secret123' }, ctx);
    await expect(
      service.register({ name: 'Jane', email: 'jane@example.com', password: 'Secret123' }, ctx),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('AuthService.login', () => {
  it('rejects a wrong password with 401', async () => {
    await service.register({ name: 'Jane', email: 'jane@example.com', password: 'Secret123' }, ctx);
    await expect(
      service.login({ email: 'jane@example.com', password: 'WrongPass1' }, ctx),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects an unknown email with 401', async () => {
    await expect(
      service.login({ email: 'ghost@example.com', password: 'whatever1' }, ctx),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('AuthService.adminLogin', () => {
  it('rejects a customer with 403', async () => {
    await service.register({ name: 'Jane', email: 'jane@example.com', password: 'Secret123' }, ctx);
    await expect(
      service.adminLogin({ email: 'jane@example.com', password: 'Secret123' }, ctx),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows an admin', async () => {
    await seedAdmin(UserRole.Admin);
    const { result } = await service.adminLogin(
      { email: 'admin@lorka.com', password: 'Admin@12345' },
      ctx,
    );
    expect(result.user.role).toBe(UserRole.Admin);
    expect(result.accessToken).toBeTruthy();
  });

  it('still rejects a wrong admin password with 401', async () => {
    await seedAdmin(UserRole.SuperAdmin);
    await expect(
      service.adminLogin({ email: 'admin@lorka.com', password: 'nope12345' }, ctx),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('AuthService.refresh', () => {
  it('rotates the refresh token and revokes the old one', async () => {
    const { refresh: first } = await service.register(
      { name: 'Jane', email: 'jane@example.com', password: 'Secret123' },
      ctx,
    );

    const { refresh: second } = await service.refresh(first.token, ctx);
    expect(second.token).not.toBe(first.token);

    // The original token must no longer be usable after rotation.
    await expect(service.refresh(first.token, ctx)).rejects.toMatchObject({ statusCode: 401 });

    // The new token works.
    const { refresh: third } = await service.refresh(second.token, ctx);
    expect(third.token).toBeTruthy();
  });
});

describe('AuthService password reset', () => {
  it('resets the password, invalidates old credentials, and revokes sessions', async () => {
    await service.register({ name: 'Jane', email: 'jane@example.com', password: 'Secret123' }, ctx);

    await service.forgotPassword('jane@example.com', ctx);
    expect(email.sent).toHaveLength(1);
    const token = new URL(email.sent[0]!.resetUrl).searchParams.get('token')!;
    expect(token).toBeTruthy();

    await service.resetPassword(token, 'BrandNew123', ctx);

    // Old password fails, new one works.
    await expect(
      service.login({ email: 'jane@example.com', password: 'Secret123' }, ctx),
    ).rejects.toMatchObject({ statusCode: 401 });
    const { result } = await service.login(
      { email: 'jane@example.com', password: 'BrandNew123' },
      ctx,
    );
    expect(result.accessToken).toBeTruthy();
  });

  it('does not reveal whether an email exists', async () => {
    await expect(service.forgotPassword('ghost@example.com', ctx)).resolves.toBeUndefined();
    expect(email.sent).toHaveLength(0);
  });
});

describe('AuthService.googleLogin', () => {
  const identity = { uid: 'google-uid-1', email: 'jane@gmail.com', name: 'Jane Doe' };
  let verifier: { verify: () => Promise<typeof identity> };
  let googleService: AuthService;

  beforeEach(() => {
    verifier = { verify: async () => identity };
    googleService = new AuthService(
      users,
      refresh,
      email,
      new AuditLogService(new FakeAuditLogRepository()),
      verifier,
    );
  });

  it('responds 501 when Google login is not configured', async () => {
    await expect(service.googleLogin({ idToken: 'token' }, ctx)).rejects.toMatchObject({ statusCode: 501 });
  });

  it('asks a new customer for their name before creating the account', async () => {
    const outcome = await googleService.googleLogin({ idToken: 'token' }, ctx);
    expect(outcome).toEqual({ kind: 'needs_name', email: 'jane@gmail.com', suggestedName: 'Jane Doe' });
    expect(await users.findByEmail('jane@gmail.com')).toBeNull();
  });

  it('creates a verified customer once the name is given', async () => {
    const outcome = await googleService.googleLogin({ idToken: 'token', name: 'Jane' }, ctx);
    expect(outcome.kind).toBe('session');
    if (outcome.kind !== 'session') return;
    expect(outcome.isNewUser).toBe(true);
    expect(outcome.issued.result.user).toMatchObject({ name: 'Jane', emailVerified: true, role: UserRole.Customer });
  });

  it('signs an existing password account in and marks its email verified', async () => {
    await service.register({ name: 'Jane', email: 'jane@gmail.com', password: 'Secret123' }, ctx);
    const outcome = await googleService.googleLogin({ idToken: 'token' }, ctx);
    expect(outcome.kind).toBe('session');
    if (outcome.kind !== 'session') return;
    expect(outcome.isNewUser).toBe(false);
    expect(outcome.issued.result.user.emailVerified).toBe(true);
  });

  it('rejects a blocked account with 403', async () => {
    const blocked = { ...identity, email: 'blocked@gmail.com' };
    await users.create({ name: 'B', email: blocked.email, passwordHash: 'x', role: UserRole.Customer });
    const original = users.findByEmail.bind(users);
    users.findByEmail = async (e) => {
      const user = await original(e);
      return user && { ...user, isBlocked: true };
    };
    verifier.verify = async () => blocked;
    await expect(googleService.googleLogin({ idToken: 'token' }, ctx)).rejects.toMatchObject({ statusCode: 403 });
  });
});
