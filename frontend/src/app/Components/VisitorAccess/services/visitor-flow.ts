import { Injectable } from '@angular/core';

export interface VisitorFlowData {
  requestId: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  residentName: string;
  building: string;
  unit: string;
  buildingId: string;
  unitId: string;
  visitDate: string;
  startTime: string;
  purpose: string;
  requestStatus: 'Pending' | 'Approved' | 'Rejected';
  qrStatus: 'Not Generated' | 'Valid' | 'Expired' | 'Already Used';
  visitStatus: 'Pending Approval' | 'Approved' | 'QR Generated' | 'Checked In' | 'Checked Out' | 'Rejected' | 'Expired';
  qrExpiration: string;
  qrToken: string;
  checkInTime: string;
  checkOutTime: string;
}

const STORAGE_KEY = 'civicsync.visitor-flow';

const emptyVisit = (): VisitorFlowData => ({
  requestId: '', visitorName: '', visitorEmail: '', visitorPhone: '',
  residentName: '', building: '', unit: '', buildingId: '', unitId: '',
  visitDate: '', startTime: '', purpose: '', requestStatus: 'Pending',
  qrStatus: 'Not Generated', visitStatus: 'Pending Approval', qrExpiration: '',
  qrToken: '', checkInTime: '', checkOutTime: ''
});

@Injectable({ providedIn: 'root' })
export class VisitorFlow {
  private visit: VisitorFlowData = this.load();

  getVisit(): VisitorFlowData {
    return { ...this.visit };
  }

  hasVisit(): boolean {
    return !!this.visit.requestId;
  }

  updateVisit(data: Partial<VisitorFlowData>): void {
    this.visit = { ...this.visit, ...data };
    this.persist();
  }

  submitRequest(data: Partial<VisitorFlowData>): void {
    this.visit = { ...emptyVisit(), ...data };
    this.persist();
  }

  checkIn(): void {
    if (this.visit.visitStatus !== 'QR Generated') {
      return;
    }

    this.visit = {
      ...this.visit,
      checkInTime: this.getCurrentTime(),
      visitStatus: 'Checked In'
    };

    this.persist();
  }

  checkOut(): void {
    if (this.visit.visitStatus !== 'Checked In') {
      return;
    }

    this.visit = {
      ...this.visit,
      checkOutTime: this.getCurrentTime(),
      visitStatus: 'Checked Out',
      qrStatus: 'Already Used'
    };

    this.persist();
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  clear(): void {
    this.visit = emptyVisit();
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY);
  }

  private load(): VisitorFlowData {
    if (typeof sessionStorage === 'undefined') return emptyVisit();
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? { ...emptyVisit(), ...JSON.parse(stored) } : emptyVisit();
    } catch {
      return emptyVisit();
    }
  }

  private persist(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.visit));
    }
  }
}
