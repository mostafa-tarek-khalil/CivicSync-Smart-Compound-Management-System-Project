import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface VisitUnit {
  _id: string;
  unitNumber: string | number;
  floor: number;
  buildingId: { _id: string; name: string; buildingNumber: number };
}

export interface VisitRecord {
  _id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string | null;
  status: string;
  visitDate: string;
  visitStartTime: string;
  purpose?: string | null;
  residentId?: { _id: string; name: string } | string | null;
  buildingId?: { _id: string; name: string; buildingNumber: number } | string;
  unitId?: { _id: string; unitNumber: string | number; floor: number } | string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  qrExpiresAt?: string | null;
  securityId?: { name: string; email: string } | string | null;
  checkOutSecurityId?: { name: string; email: string } | string | null;
  source?: 'RESIDENT_INVITE' | 'VISITOR_REQUEST';
  qrScannedAt?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  /**
   * Only present on the visitor-facing status endpoint, and only while the
   * visit is chat-eligible. Required to open the visitor conversation.
   */
  visitorChatToken?: string | null;
  visitorChatTokenExpiresAt?: string | null;
}

export interface ResidentVisitorRequest extends VisitRecord {
  residentId?: { _id: string; name: string } | string | null;
}

/** Lightweight summary returned by the visitor lookup endpoint. */
export interface VisitorRequestSummary {
  _id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string | null;
  status: string;
  visitDate: string;
  visitStartTime: string;
  purpose?: string | null;
  residentId?: { _id: string; name: string } | string | null;
  buildingId?: { _id: string; name: string; buildingNumber: number } | string;
  unitId?: { _id: string; unitNumber: string | number; floor: number } | string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class VisitService {
  private readonly apiUrl = `${environment.apiUrl}/visits`;

  constructor(private http: HttpClient) { }

  getVisitorUnits(): Observable<{ success: boolean; data: VisitUnit[] }> {
    return this.http.get<{ success: boolean; data: VisitUnit[] }>(`${this.apiUrl}/visitor-units`);
  }

  createVisitorRequest(data: {
    visitorName: string;
    visitorEmail: string;
    visitorPhone: string;
    buildingId: string;
    unitId: string;
    visitDate: string;
    visitStartTime: string;
    purpose: string;
  }): Observable<{ success: boolean; data: { visitId: string; status: string } }> {
    return this.http.post<{ success: boolean; data: { visitId: string; status: string } }>(`${this.apiUrl}/visitor-requests`, data);
  }

  /**
   * (Re)sends the visitor OTP. The backend returns the new expiry so the UI can
   * count down against the real deadline instead of guessing the TTL.
   */
  sendVisitorOtp(visitId: string): Observable<{
    success: boolean;
    data: { visitId: string; expiresAt: string; expiresInSeconds?: number };
  }> {
    return this.http.post<{
      success: boolean;
      data: { visitId: string; expiresAt: string; expiresInSeconds?: number };
    }>(`${this.apiUrl}/visitor-requests/${visitId}/otp`, {});
  }

  verifyVisitorOtp(visitId: string, otp: string): Observable<{ success: boolean; data: { status: string } }> {
    return this.http.post<{ success: boolean; data: { status: string } }>(`${this.apiUrl}/visitor-requests/${visitId}/otp/verify`, { otp });
  }

  getVisitorStatus(visitId: string, email: string): Observable<{ success: boolean; data: VisitRecord }> {
    const params = new HttpParams().set('email', email);
    return this.http.get<{ success: boolean; data: VisitRecord }>(`${this.apiUrl}/visitor-requests/${visitId}/status`, { params });
  }

  lookupVisitorRequests(email: string): Observable<{ success: boolean; count: number; data: VisitorRequestSummary[] }> {
    const params = new HttpParams().set('email', email);
    return this.http.get<{ success: boolean; count: number; data: VisitorRequestSummary[] }>(
      `${this.apiUrl}/visitor-requests/lookup`,
      { params }
    );
  }

  getVisitorQr(
    visitId: string,
    email: string
  ): Observable<{
    success: boolean;
    data: {
      qrToken: string;
      expiresAt: string;
    };
  }> {
    return this.http.post<{
      success: boolean;
      data: {
        qrToken: string;
        expiresAt: string;
      };
    }>(
      `${this.apiUrl}/visitor-requests/${visitId}/qr`,
      { email }
    );
  }

  getSecurityVisits(): Observable<{ success: boolean; data: VisitRecord[] }> {
    return this.http.get<{ success: boolean; data: VisitRecord[] }>(`${this.apiUrl}/security/visits`);
  }

  getSecurityVisit(visitId: string): Observable<{ success: boolean; data: VisitRecord }> {
    return this.http.get<{ success: boolean; data: VisitRecord }>(`${this.apiUrl}/security/visits/${visitId}`);
  }

  scanQr(
    qrToken: string
  ): Observable<{
    success: boolean;
    data: VisitRecord & { visitId: string };
  }> {
    return this.http.post<{
      success: boolean;
      data: VisitRecord & { visitId: string };
    }>(
      `${this.apiUrl}/scan`,
      { qrToken }
    );
  }

  checkIn(visitId: string): Observable<{ success: boolean; data: VisitRecord }> {
    return this.http.patch<{ success: boolean; data: VisitRecord }>(`${this.apiUrl}/${visitId}/check-in`, {});
  }

  checkOut(visitId: string): Observable<{ success: boolean; data: VisitRecord }> {
    return this.http.patch<{ success: boolean; data: VisitRecord }>(`${this.apiUrl}/${visitId}/check-out`, {});
  }

  // ---------- Resident flow ----------

  /**
   * A resident inviting a visitor directly. The backend derives the building
   * and unit from the resident's own profile, so only the visitor details and
   * the visit slot are sent.
   */
  createVisit(data: {
    visitorName: string;
    visitorEmail: string;
    visitorPhone?: string;
    visitDate: string;
    visitStartTime: string;
    purpose?: string;
  }): Observable<{ success: boolean; data: VisitRecord }> {
    return this.http.post<{ success: boolean; data: VisitRecord }>(`${this.apiUrl}`, data);
  }

  /** All visits the signed-in resident created (invites they issued). */
  getMyVisits(): Observable<{ success: boolean; data: VisitRecord[] }> {
    return this.http.get<{ success: boolean; data: VisitRecord[] }>(`${this.apiUrl}`);
  }

  getResidentVisitorRequests(): Observable<{ success: boolean; data: ResidentVisitorRequest[] }> {
    return this.http.get<{ success: boolean; data: ResidentVisitorRequest[] }>(`${this.apiUrl}/visitor-requests`);
  }

  approveVisitorRequest(
    visitId: string
  ): Observable<{ success: boolean; data: { visitId: string; status: string; visitorChatToken?: string } }> {
    return this.http.patch<{ success: boolean; data: { visitId: string; status: string; visitorChatToken?: string } }>(
      `${this.apiUrl}/visitor-requests/${visitId}/approve`,
      {}
    );
  }

  rejectVisitorRequest(
    visitId: string
  ): Observable<{ success: boolean; data: { visitId: string; status: string } }> {
    return this.http.patch<{ success: boolean; data: { visitId: string; status: string } }>(
      `${this.apiUrl}/visitor-requests/${visitId}/reject`,
      {}
    );
  }
}
