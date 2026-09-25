import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VisitService, ResidentVisitorRequest } from '../../../../../Services/visit-service';
import { ChatSocket } from '../../../../../core/services/chat-socket';

interface ResidentRequestRow {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  building: string;
  unit: string;
  visitDate: string;
  startTime: string;
  purpose: string;
  source: 'RESIDENT_INVITE' | 'VISITOR_REQUEST';
  sourceLabel: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'QR_GENERATED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'EXPIRED';
  statusLabel: string;
}

@Component({
  selector: 'app-resident-visitor-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resident-visitor-requests.html',
  styleUrl: './resident-visitor-requests.css'
})
export class ResidentVisitorRequests implements OnInit, OnDestroy {

  requests: ResidentRequestRow[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  private actioningId: string | null = null;

  /** Keep the list in sync when security checks a visitor in/out. */
  private readonly REALTIME_EVENTS = ['notification:new', 'visit:updated'];
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private onRealtimeEvent = () => this.scheduleReload();

  constructor(
    private visitService: VisitService,
    private chatSocket: ChatSocket,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadRequests();

    this.zone.runOutsideAngular(() => {
      this.chatSocket.connect();
      this.REALTIME_EVENTS.forEach((event) =>
        this.chatSocket.on(event, this.onRealtimeEvent)
      );
    });
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.REALTIME_EVENTS.forEach((event) =>
      this.chatSocket.off(event, this.onRealtimeEvent)
    );
  }

  private scheduleReload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.zone.run(() => this.loadRequests());
    }, 400);
  }

  loadRequests(): void {
    this.loading = true;
    this.errorMessage = '';
    this.visitService.getResidentVisitorRequests().subscribe({
      next: response => {
        this.requests = response.data.map(request => this.toRow(request));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.requests = [];
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Could not load visitor requests.';
        this.cdr.detectChanges();
      }
    });
  }

  private toRow(request: ResidentVisitorRequest): ResidentRequestRow {
    const source = (request.source || 'VISITOR_REQUEST') as ResidentRequestRow['source'];

    return {
      id: request._id,
      visitorName: request.visitorName,
      visitorEmail: request.visitorEmail,
      visitorPhone: request.visitorPhone || '-',
      building: typeof request.buildingId === 'object' && request.buildingId ? request.buildingId.name : '-',
      unit: typeof request.unitId === 'object' && request.unitId ? String(request.unitId.unitNumber) : '-',
      visitDate: this.formatDate(request.visitDate),
      startTime: request.visitStartTime,
      purpose: request.purpose || 'Visit',
      source,
      sourceLabel: this.sourceLabel(source),
      status: request.status as ResidentRequestRow['status'],
      statusLabel: this.statusLabel(request.status)
    };
  }

  /** Distinguishes a visit the resident invited from one a visitor requested. */
  private sourceLabel(source: string): string {
    return source === 'RESIDENT_INVITE' ? 'You invited' : 'Requested';
  }

  private statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'QR_GENERATED': return 'QR Ready';
      case 'CHECKED_IN': return 'Checked In';
      case 'CHECKED_OUT': return 'Checked Out';
      case 'EXPIRED': return 'Expired';
      default: return status;
    }
  }

  private formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  get pendingCount(): number {
    return this.requests.filter(request => request.status === 'PENDING').length;
  }

  isActioning(request: ResidentRequestRow): boolean {
    return this.actioningId === request.id;
  }

  approve(request: ResidentRequestRow): void {
    this.act(request, () => this.visitService.approveVisitorRequest(request.id), 'Visitor request approved.');
  }

  reject(request: ResidentRequestRow): void {
    this.act(request, () => this.visitService.rejectVisitorRequest(request.id), 'Visitor request rejected.');
  }

  /** A QR pass can be viewed once the visit has been approved. */
  canViewQr(request: ResidentRequestRow): boolean {
    return request.status === 'APPROVED' || request.status === 'QR_GENERATED';
  }

  /**
   * Open the QR pass page for this visitor. The visitor-facing QR endpoint is
   * keyed by (visitId, visitorEmail), so we forward the email the resident
   * already sees on the card.
   */
  viewQrPass(request: ResidentRequestRow): void {
    this.router.navigate(['/qr-code-display'], {
      queryParams: {
        visitId: request.id,
        email: request.visitorEmail
      }
    });
  }

  private act(
    request: ResidentRequestRow,
    action: () => ReturnType<VisitService['approveVisitorRequest']>,
    successText: string
  ): void {
    if (this.actioningId) {
      return;
    }
    this.actioningId = request.id;
    this.errorMessage = '';
    this.successMessage = '';
    action().subscribe({
      next: response => {
        this.actioningId = null;
        this.successMessage = successText;
        // Reflect the real status returned by the backend (approving
        // immediately moves the visit to QR_GENERATED) instead of guessing
        // it locally, then refresh the whole list so every row - including
        // ones security may have already acted on in the meantime - is
        // in sync with the server.
        const realStatus = response?.data?.status as ResidentRequestRow['status'] | undefined;
        if (realStatus) {
          request.status = realStatus;
          request.statusLabel = this.statusLabel(realStatus);
        }
        this.cdr.detectChanges();
        this.loadRequests();
      },
      error: error => {
        this.actioningId = null;
        this.errorMessage = error?.error?.message || 'The action could not be completed.';
        this.cdr.detectChanges();
      }
    });
  }
}