import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VisitService, VisitorRequestSummary } from '../../../../../Services/visit-service';
import { VisitorFlow } from '../../../services/visitor-flow';
import { toSecurityStatus, formatDate } from '../../../services/visit-status.util';

interface LookupRow {
  id: string;
  visitorName: string;
  email: string;
  building: string;
  unit: string;
  resident: string;
  date: string;
  startTime: string;
  purpose: string;
  status: string;
  statusCode: string;
}

type LookupState = 'idle' | 'loading' | 'empty' | 'results' | 'error';

@Component({
  selector: 'app-visitor-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './visitor-lookup.html',
  styleUrl: './visitor-lookup.css'
})
export class VisitorLookup {

  email = '';
  state: LookupState = 'idle';
  rows: LookupRow[] = [];
  errorMessage = '';

  constructor(
    private router: Router,
    private visitService: VisitService,
    private visitorFlow: VisitorFlow,
    private cdr: ChangeDetectorRef
  ) {
    // Pre-fill with the email of a saved in-progress visit, if any.
    const saved = this.visitorFlow.getVisit();
    if (saved.visitorEmail) {
      this.email = saved.visitorEmail;
    }
  }

  search(): void {
    const email = this.email.trim().toLowerCase();
    if (!email) {
      this.errorMessage = 'Enter the email address you used for the request.';
      this.state = 'error';
      return;
    }

    this.state = 'loading';
    this.errorMessage = '';
    this.rows = [];

    this.visitService.lookupVisitorRequests(email).subscribe({
      next: response => {
        this.rows = response.data.map(item => this.toRow(item));
        this.state = this.rows.length ? 'results' : 'empty';
        this.cdr.detectChanges();
      },
      error: error => {
        this.state = 'error';
        this.errorMessage = error?.error?.message || 'Could not look up your requests. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private toRow(item: VisitorRequestSummary): LookupRow {
    return {
      id: item._id,
      visitorName: item.visitorName,
      email: item.visitorEmail,
      building: typeof item.buildingId === 'object' && item.buildingId ? item.buildingId.name : '',
      unit: typeof item.unitId === 'object' && item.unitId ? String(item.unitId.unitNumber) : '',
      resident: typeof item.residentId === 'object' && item.residentId ? item.residentId.name : '',
      date: formatDate(item.visitDate),
      startTime: item.visitStartTime,
      purpose: item.purpose || 'Visit',
      status: this.statusLabel(item.status),
      statusCode: item.status
    };
  }

  private statusLabel(status: string): string {
    const view = toSecurityStatus(status);
    if (status === 'REJECTED') return 'Rejected';
    if (status === 'EXPIRED') return 'Expired';
    if (status === 'CHECKED_OUT') return 'Checked Out';
    if (status === 'CHECKED_IN') return 'Checked In';
    if (status === 'QR_GENERATED') return 'QR Ready';
    if (status === 'APPROVED') return 'Approved';
    return view === 'Pending' ? 'Pending Approval' : view;
  }

  open(row: LookupRow): void {
    // Track the real backend status code — no local re-interpretation.
    this.visitorFlow.trackVisit({
      requestId: row.id,
      visitorEmail: row.email,
      visitorName: row.visitorName,
      visitorPhone: '',
      residentName: row.resident,
      building: row.building,
      unit: row.unit,
      visitDate: row.date,
      startTime: row.startTime,
      purpose: row.purpose,
      status: row.statusCode
    });

    // A visit that is already approved (e.g. a resident invite, or an approved
    // request) goes straight to the QR pass — there is no OTP step left to do.
    if (row.statusCode === 'APPROVED' || row.statusCode === 'QR_GENERATED') {
      this.router.navigate(['/qr-code-display']);
      return;
    }

    this.router.navigate(['/visitor-request-status']);
  }

  isOpennable(row: LookupRow): boolean {
    return ['PENDING', 'APPROVED', 'QR_GENERATED', 'CHECKED_IN', 'CHECKED_OUT'].includes(row.statusCode);
  }

  reset(): void {
    this.state = 'idle';
    this.rows = [];
    this.errorMessage = '';
  }
}