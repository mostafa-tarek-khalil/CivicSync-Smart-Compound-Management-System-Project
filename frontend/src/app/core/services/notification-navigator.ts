import { NotificationType, UserRole } from '../models/status';

/**
 * Navigation target for a notification, derived from `type` + `relatedId`.
 *
 * This is the ONLY place that maps a notification to a destination, so the
 * topbar, the toast stack and the notifications page all behave identically.
 */
export type NotificationRoute = (string | Record<string, string>)[];

const RESIDENT_FALLBACK: NotificationRoute = ['/resident/dashboard'];
const TECHNICIAN_FALLBACK: NotificationRoute = ['/technician/dashboard'];
const SECURITY_FALLBACK: NotificationRoute = ['/security/visitors'];
const ADMIN_FALLBACK: NotificationRoute = ['/admin/dashboard'];

export function resolveNotificationRoute(
  type: string,
  role: string,
  relatedId?: string | null
): NotificationRoute {
  if (role === UserRole.RESIDENT) {
    switch (type) {
      case NotificationType.MAINTENANCE_CREATED:
      case NotificationType.TICKET_ASSIGNED:
      case NotificationType.TICKET_STATUS_CHANGED:
        return relatedId
          ? ['/resident/maintenance', relatedId]
          : ['/resident/maintenance-view'];

      case NotificationType.NEW_OFFER:
      case NotificationType.NEW_NEGOTIATION:
        return relatedId
          ? ['/resident/maintenance', relatedId, 'offers']
          : ['/resident/maintenance-view'];

      case NotificationType.OFFER_ACCEPTED:
      case NotificationType.OFFER_REJECTED:
        return ['/resident/maintenance-view'];

      case NotificationType.VISITOR_REQUEST:
      case NotificationType.VISITOR_APPROVED:
      case NotificationType.VISITOR_REJECTED:
      case NotificationType.VISITOR_CHECKED_IN:
      case NotificationType.VISITOR_CHECKED_OUT:
        // The resident visitor screen is a single approval list, so the
        // visit-scoped destination is the list itself.
        return ['/resident/visitors'];

      case NotificationType.INVOICE_CREATED:
      case NotificationType.INVOICE_DUE:
        return ['/resident/invoices'];

      case NotificationType.NEW_MESSAGE:
        return ['/chat'];

      default:
        return RESIDENT_FALLBACK;
    }
  }

  if (role === UserRole.TECHNICIAN) {
    switch (type) {
      case NotificationType.OFFER_ACCEPTED:
        return relatedId
          ? ['/technician/job', relatedId]
          : ['/technician/my-offers'];

      case NotificationType.OFFER_REJECTED:
        return ['/technician/my-offers'];

      case NotificationType.NEW_NEGOTIATION:
        return relatedId
          ? ['/technician/offer', relatedId, 'negotiation']
          : ['/technician/my-offers'];

      case NotificationType.TICKET_STATUS_CHANGED:
      case NotificationType.TICKET_ASSIGNED:
        return relatedId
          ? ['/technician/job', relatedId]
          : ['/technician/assigned-jobs'];

      case NotificationType.ACCOUNT_APPROVED:
      case NotificationType.ACCOUNT_REJECTED:
        return ['/profile'];

      case NotificationType.NEW_MESSAGE:
        return ['/chat'];

      default:
        return TECHNICIAN_FALLBACK;
    }
  }

  if (role === UserRole.SECURITY) {
    switch (type) {
      case NotificationType.VISITOR_REQUEST:
      case NotificationType.VISITOR_APPROVED:
      case NotificationType.VISITOR_REJECTED:
        return ['/security/visitors/list'];

      case NotificationType.VISITOR_CHECKED_IN:
      case NotificationType.VISITOR_CHECKED_OUT:
        return relatedId
          ? ['/security/visitors/details', { visitId: relatedId }]
          : ['/security/visitors/history'];

      case NotificationType.NEW_MESSAGE:
        return ['/chat'];

      default:
        return SECURITY_FALLBACK;
    }
  }

  if (role === UserRole.ADMIN) {
    switch (type) {
      case NotificationType.VISITOR_REQUEST:
      case NotificationType.VISITOR_APPROVED:
      case NotificationType.VISITOR_REJECTED:
      case NotificationType.VISITOR_CHECKED_IN:
      case NotificationType.VISITOR_CHECKED_OUT:
        return ['/admin/visitors'];

      case NotificationType.MAINTENANCE_CREATED:
      case NotificationType.NEW_OFFER:
      case NotificationType.NEW_NEGOTIATION:
      case NotificationType.OFFER_ACCEPTED:
      case NotificationType.OFFER_REJECTED:
      case NotificationType.TICKET_ASSIGNED:
      case NotificationType.TICKET_STATUS_CHANGED:
        return ['/admin/maintenance'];

      case NotificationType.INVOICE_CREATED:
      case NotificationType.INVOICE_DUE:
        return ['/admin/invoices'];

      case NotificationType.ACCOUNT_APPROVED:
      case NotificationType.ACCOUNT_REJECTED:
        return ['/admin/users'];

      default:
        return ADMIN_FALLBACK;
    }
  }

  return ['/notifications'];
}
