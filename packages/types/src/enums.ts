export enum UserRole {
  Customer = 'customer',
  Admin = 'admin',
  SuperAdmin = 'super_admin',
}

export const USER_ROLES = Object.values(UserRole);

/** Roles that may access the admin panel. */
export const ADMIN_ROLES: UserRole[] = [UserRole.Admin, UserRole.SuperAdmin];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}
