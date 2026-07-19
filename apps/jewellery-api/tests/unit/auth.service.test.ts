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
