import { VisitRecord } from '../../../Services/visit-service';

/**
 * View-facing status labels used across the security screens.
 * They are intentionally coarser than the backend state machine.
 */
export type SecurityViewStatus =
  | 'Pending'
  | 'Approved'
  | 'Checked In'
  | 'Checked Out'
  | 'Rejected'
  | 'Expired';

/** Map a backend visit status to the label the security UI understands. */
export function toSecurityStatus(status: string): SecurityViewStatus {
  switch (status) {
    case 'QR_GENERATED':
      return 'Approved';
    case 'APPROVED':
      return 'Approved';
    case 'CHECKED_IN':
      return 'Checked In';
    case 'CHECKED_OUT':
      return 'Checked Out';
    case 'REJECTED':
      return 'Rejected';
    case 'EXPIRED':
      return 'Expired';
    case 'PENDING':
    default:
      return 'Pending';
  }
}

/** True when a visit row should be considered part of the access history. */
export function isHistoricalVisit(visit: VisitRecord): boolean {
  return visit.status === 'CHECKED_IN' || visit.status === 'CHECKED_OUT' || visit.status === 'EXPIRED';
}

/** Format an ISO date + HH:mm start time for the `security-visits` cards. */
export function splitStartTime(visitStartTime: string): { time: string; period: string } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(visitStartTime || '');
  if (!match) {
    return { time: visitStartTime || '-', period: '' };
  }

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { time: `${String(hours12).padStart(2, '0')}:${minutes}`, period };
}

/** Human readable date, e.g. "September 22, 2026". */
export function formatDate(value?: string | null): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Human readable time (hour:minute AM/PM) from an ISO timestamp. */
export function formatTime(value?: string | null): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function buildingLabel(visit: VisitRecord): string {
  return typeof visit.buildingId === 'object' && visit.buildingId ? visit.buildingId.name : '-';
}

export function unitLabel(visit: VisitRecord): string {
  return typeof visit.unitId === 'object' && visit.unitId ? String(visit.unitId.unitNumber) : '-';
}

export function residentLabel(visit: VisitRecord): string {
  return typeof visit.residentId === 'object' && visit.residentId ? visit.residentId.name : 'Resident';
}