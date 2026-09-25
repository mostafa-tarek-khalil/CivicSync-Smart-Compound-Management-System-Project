import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { IInvoiceDetail } from '../shared/invoice/invoice.model';

export interface AdminDashboardOverview {
  users: {
    total: number;
    pending: number;
    activeResidents: number;
    activeTechnicians: number;
    activeSecurity: number;
  };
  buildings: { total: number };
  units: { total: number; occupied: number; vacant: number };
  maintenance: { open: number };
  invoices: {
    overdue: number;
    /** Sum of every non-cancelled invoice ever issued. */
    totalBilled: number;
    /** Sum of invoices confirmed as PAID. */
    totalCollected: number;
    /** Still owed: PENDING + OVERDUE + PAYMENT_SUBMITTED. */
    totalOutstanding: number;
    /** Count of resident payment claims waiting on an admin decision. */
    awaitingApproval: number;
  };
  visits: { total: number };
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  unitId: unknown;
  createdAt: string;
}

export interface AdminBuilding {
  _id: string;
  name: string;
  buildingNumber: number;
  description?: string | null;
  floors?: number;
  floorsCount?: number;
  unitsCount?: number;
}

export interface AdminUnit {
  _id: string;
  unitNumber: number;
  floor: number;
  type: string;
  status: string;
  buildingId: { _id: string; name: string; buildingNumber: number } | string;
}

export interface AdminInvoice {
  _id: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  paidAt?: string | null;
  residentId?: { _id: string; name: string; email: string } | string;
  ticketId?: { _id: string; title: string } | string;
}

export interface AdminMaintenanceTicket {
  _id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  residentId?: { _id: string; name: string } | string;
  assignedTo?: { _id: string; name: string } | string | null;
}

/** Full ticket payload behind the admin "View" modal. */
export interface AdminTicketDetails {
  ticket: {
    _id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    attachmentUrl?: string | null;
    residentId?:
      | {
          _id: string;
          name: string;
          email: string;
          phone?: string | null;
        }
      | string
      | null;
    assignedTo?:
      | {
          _id: string;
          name: string;
          email?: string;
          phone?: string | null;
          role?: string;
          rating?: number;
          totalReviews?: number;
          specializations?: string[];
        }
      | string
      | null;
  };
  review: {
    _id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    residentId?: { _id: string; name: string } | string;
    technicianId?: { _id: string; name: string } | string;
  } | null;
  invoice: {
    _id: string;
    amount: number;
    status: string;
    dueDate: string;
    paidAt?: string | null;
    description?: string | null;
    createdAt: string;
  } | null;
  location: {
    unitNumber: number;
    floor: number;
    type: string;
    status: string;
    buildingName: string | null;
    buildingNumber: number | null;
  } | null;
}

export interface AdminVisit {
  _id: string;
  visitorName: string;
  visitorEmail: string;
  status: string;
  source: string;
  visitDate: string;
  visitStartTime: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  residentId?: { _id: string; name: string } | string | null;
  unitId?: { _id: string; unitNumber: number } | string | null;
}

/** One bucket of a `$group`-style aggregate: { _id, count, totalAmount? }. */
export interface AnalyticsBucket {
  _id: string | null;
  count: number;
  totalAmount?: number;
}

export interface AnalyticsPoint {
  date: string;
  count: number;
  checkedIn: number;
}

export interface AdminReports {
  users: {
    byRole: AnalyticsBucket[];
    byStatus: AnalyticsBucket[];
  };
  maintenance: {
    byStatus: AnalyticsBucket[];
    byPriority: AnalyticsBucket[];
  };
  invoices: {
    byStatus: AnalyticsBucket[];
  };
  visits: {
    byStatus: AnalyticsBucket[];
    overTime: AnalyticsPoint[];
  };
  units: {
    byStatus: AnalyticsBucket[];
  };
  revenue: {
    totalBilled: number;
    paid: number;
    outstanding: number;
    overdue: number;
    byStatus: Record<string, { count: number; total: number }>;
  };
}

/** E-mail + role directory rows used by the printable report. */
export interface ReportUserRow {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  unitId?: { unitNumber?: number; floor?: number } | string | null;
}

export interface FullCompoundReport {
  generatedAt: string;
  overview: AdminDashboardOverview;
  analytics: AdminReports;
  users: ReportUserRow[];
  buildings: AdminBuilding[];
  units: AdminUnit[];
  maintenance: AdminMaintenanceTicket[];
  invoices: AdminInvoice[];
  visits: AdminVisit[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<ApiResponse<AdminDashboardOverview>> {
    return this.http.get<ApiResponse<AdminDashboardOverview>>(
      `${this.apiUrl}/dashboard`
    );
  }

  getUsers(params?: {
    status?: string;
    role?: string;
    search?: string;
  }): Observable<ApiResponse<AdminUser[]>> {
    return this.http.get<ApiResponse<AdminUser[]>>(
      `${this.apiUrl}/users`,
      { params }
    );
  }

  approveUser(userId: string): Observable<ApiResponse<AdminUser>> {
    return this.http.patch<ApiResponse<AdminUser>>(
      `${this.apiUrl}/users/${userId}/approve`,
      {}
    );
  }

  rejectUser(userId: string): Observable<ApiResponse<AdminUser>> {
    return this.http.patch<ApiResponse<AdminUser>>(
      `${this.apiUrl}/users/${userId}/reject`,
      {}
    );
  }

  /** Update an account's editable identity fields (name, phone, email). */
  updateUser(
    userId: string,
    data: { name?: string; phone?: string; email?: string }
  ): Observable<ApiResponse<AdminUser>> {
    return this.http.patch<ApiResponse<AdminUser>>(
      `${this.apiUrl}/users/${userId}`,
      data
    );
  }

  // ---------- Compound ----------

  getBuildings(): Observable<ApiResponse<AdminBuilding[]>> {
    return this.http.get<ApiResponse<AdminBuilding[]>>(
      `${this.apiUrl}/buildings`
    );
  }

  createBuilding(data: {
    name: string;
    buildingNumber: number;
    floorsCount: number;
    unitsCount?: number;
    description?: string;
  }): Observable<ApiResponse<AdminBuilding>> {
    return this.http.post<ApiResponse<AdminBuilding>>(
      `${this.apiUrl}/buildings`,
      data
    );
  }

  updateBuilding(
    buildingId: string,
    data: {
      name?: string;
      buildingNumber?: number;
      floorsCount?: number;
      unitsCount?: number;
      description?: string;
    }
  ): Observable<ApiResponse<AdminBuilding>> {
    return this.http.patch<ApiResponse<AdminBuilding>>(
      `${this.apiUrl}/buildings/${buildingId}`,
      data
    );
  }

  getUnits(params?: {
    buildingId?: string;
    status?: string;
  }): Observable<ApiResponse<AdminUnit[]>> {
    return this.http.get<ApiResponse<AdminUnit[]>>(
      `${this.apiUrl}/units`,
      { params }
    );
  }

  createUnit(data: {
    buildingId: string;
    unitNumber: number;
    floor: number;
    type: string;
    status?: string;
  }): Observable<ApiResponse<AdminUnit>> {
    return this.http.post<ApiResponse<AdminUnit>>(
      `${this.apiUrl}/units`,
      data
    );
  }

  updateUnit(
    unitId: string,
    data: {
      unitNumber?: number;
      floor?: number;
      type?: string;
      status?: string;
    }
  ): Observable<ApiResponse<AdminUnit>> {
    return this.http.patch<ApiResponse<AdminUnit>>(
      `${this.apiUrl}/units/${unitId}`,
      data
    );
  }

  // ---------- Billing ----------

  getInvoices(params?: {
    status?: string;
    residentId?: string;
  }): Observable<ApiResponse<AdminInvoice[]>> {
    return this.http.get<ApiResponse<AdminInvoice[]>>(
      `${this.apiUrl}/invoices`,
      { params }
    );
  }

  /**
   * A single invoice with its resident, unit and originating ticket populated.
   * Backs the receipt screen and the print action.
   */
  getInvoice(invoiceId: string): Observable<ApiResponse<IInvoiceDetail>> {
    return this.http.get<ApiResponse<IInvoiceDetail>>(
      `${this.apiUrl}/invoices/${invoiceId}`
    );
  }

  /** Create an invoice for a resident / unit (optionally tied to a ticket). */
  createInvoice(data: {
    residentId: string;
    amount: number;
    dueDate: string;
    ticketId?: string;
    unitId?: string;
    description?: string;
  }): Observable<ApiResponse<AdminInvoice>> {
    return this.http.post<ApiResponse<AdminInvoice>>(
      `${this.apiUrl}/invoices`,
      data
    );
  }

  updateInvoiceStatus(
    invoiceId: string,
    status: string
  ): Observable<ApiResponse<AdminInvoice>> {
    return this.http.patch<ApiResponse<AdminInvoice>>(
      `${this.apiUrl}/invoices/${invoiceId}/status`,
      { status }
    );
  }

  // ---------- Maintenance ----------

  getMaintenanceTickets(params?: {
    status?: string;
    category?: string;
  }): Observable<ApiResponse<AdminMaintenanceTicket[]>> {
    return this.http.get<ApiResponse<AdminMaintenanceTicket[]>>(
      `${this.apiUrl}/maintenance`,
      { params }
    );
  }

  /** Full ticket (with review, invoice and location) for the details modal. */
  getMaintenanceTicket(
    ticketId: string
  ): Observable<ApiResponse<AdminTicketDetails>> {
    return this.http.get<ApiResponse<AdminTicketDetails>>(
      `${this.apiUrl}/maintenance/${ticketId}`
    );
  }

  // ---------- Visitors ----------

  getVisits(params?: {
    status?: string;
    source?: string;
  }): Observable<ApiResponse<AdminVisit[]>> {
    return this.http.get<ApiResponse<AdminVisit[]>>(
      `${this.apiUrl}/visits`,
      { params }
    );
  }

  // ---------- Reports & analytics ----------

  getReports(): Observable<ApiResponse<AdminReports>> {
    return this.http.get<ApiResponse<AdminReports>>(
      `${this.apiUrl}/reports`
    );
  }

  /** Everything the downloadable compound report is built from. */
  getFullReport(): Observable<ApiResponse<FullCompoundReport>> {
    return this.http.get<ApiResponse<FullCompoundReport>>(
      `${this.apiUrl}/reports/full`
    );
  }
}
