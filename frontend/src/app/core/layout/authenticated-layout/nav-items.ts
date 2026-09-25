import { UserRole } from '../../models/status';

/**
 * A single sidebar entry.
 *
 * `roles` scopes the item to the roles allowed to see it; an empty/omitted
 * list means "every signed-in role" (e.g. Chat, Notifications, Profile).
 */
export interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: UserRole[];
  /** Match the route exactly (used for dashboards that share a prefix). */
  exact?: boolean;
}

/**
 * THE navigation map.
 *
 * The sidebar renders `visibleNavItems` for the signed-in role, so role-based
 * navigation lives in exactly one place instead of being duplicated inside
 * four separate sidebars.
 */
export const NAV_ITEMS: NavItem[] = [
  // ---------------------------------------------------------------- Resident
  {
    label: 'Dashboard',
    route: '/resident/dashboard',
    icon: 'dashboard',
    roles: [UserRole.RESIDENT],
    exact: true
  },
  {
    label: 'Maintenance',
    route: '/resident/maintenance-view',
    icon: 'handyman',
    roles: [UserRole.RESIDENT]
  },
  {
    label: 'New Ticket',
    route: '/resident/create-ticket',
    icon: 'add_circle',
    roles: [UserRole.RESIDENT]
  },
  {
    label: 'Visitors',
    route: '/resident/visitors',
    icon: 'badge',
    roles: [UserRole.RESIDENT]
  },
  {
    label: 'Invite Visitor',
    route: '/resident/create-visit',
    icon: 'person_add',
    roles: [UserRole.RESIDENT]
  },
  {
    label: 'Invoices',
    route: '/resident/invoices',
    icon: 'receipt_long',
    roles: [UserRole.RESIDENT]
  },

  // -------------------------------------------------------------- Technician
  {
    label: 'Dashboard',
    route: '/technician/dashboard',
    icon: 'dashboard',
    roles: [UserRole.TECHNICIAN],
    exact: true
  },
  {
    label: 'Available Requests',
    route: '/technician/available-requests',
    icon: 'handyman',
    roles: [UserRole.TECHNICIAN]
  },
  {
    label: 'Assigned Jobs',
    route: '/technician/assigned-jobs',
    icon: 'work_outline',
    roles: [UserRole.TECHNICIAN]
  },
  {
    label: 'My Offers',
    route: '/technician/my-offers',
    icon: 'request_quote',
    roles: [UserRole.TECHNICIAN]
  },
  {
    label: 'Reviews',
    route: '/technician/reviews',
    icon: 'star_rate',
    roles: [UserRole.TECHNICIAN]
  },

  // ---------------------------------------------------------------- Security
  {
    label: 'Visitors',
    route: '/security/visitors',
    icon: 'dashboard',
    roles: [UserRole.SECURITY],
    exact: true
  },
  {
    label: 'Visit List',
    route: '/security/visitors/list',
    icon: 'list_alt',
    roles: [UserRole.SECURITY]
  },
  {
    label: 'QR Scanner',
    route: '/security/visitors/scanner',
    icon: 'qr_code_scanner',
    roles: [UserRole.SECURITY]
  },
  {
    label: 'Check In / Out',
    route: '/security/visitors/check-in-out',
    icon: 'fact_check',
    roles: [UserRole.SECURITY]
  },
  {
    label: 'Access History',
    route: '/security/visitors/history',
    icon: 'history',
    roles: [UserRole.SECURITY]
  },

  // ------------------------------------------------------------------- Admin
  {
    label: 'Dashboard',
    route: '/admin/dashboard',
    icon: 'dashboard',
    roles: [UserRole.ADMIN],
    exact: true
  },
  {
    label: 'Users',
    route: '/admin/users',
    icon: 'group',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Buildings & Units',
    route: '/admin/compound',
    icon: 'apartment',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Maintenance',
    route: '/admin/maintenance',
    icon: 'handyman',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Visit Logs',
    route: '/admin/visitors',
    icon: 'badge',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Invoices',
    route: '/admin/invoices',
    icon: 'receipt_long',
    roles: [UserRole.ADMIN]
  },
  {
    label: 'Reports',
    route: '/admin/reports',
    icon: 'analytics',
    roles: [UserRole.ADMIN]
  },

  // ----------------------------------------------------------------- Shared
  {
    label: 'Messages',
    route: '/chat',
    icon: 'chat',
    roles: undefined
  },
  {
    label: 'Notifications',
    route: '/notifications',
    icon: 'notifications'
  },
  {
    label: 'Profile',
    route: '/profile',
    icon: 'person'
  }
];

/**
 * Every item visible to `role`: the shared entries plus the role-specific ones.
 */
export function visibleNavItems(role: UserRole | null): NavItem[] {
  if (!role) {
    return [];
  }

  return NAV_ITEMS.filter(item => !item.roles || item.roles.includes(role));
}