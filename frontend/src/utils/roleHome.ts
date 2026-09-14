import type { Role } from '../types/api';

/** Where a user of a given role lands after login (or at "/"). */
export function homeRouteForRole(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'SUPPORT_AGENT':
      return '/support/customers';
    case 'CUSTOMER':
    default:
      return '/dashboard';
  }
}
