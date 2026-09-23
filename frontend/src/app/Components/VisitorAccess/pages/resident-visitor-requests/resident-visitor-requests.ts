import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisitService, ResidentVisitorRequest } from '../../../../Services/visit-service';

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
export class ResidentVisitorRequests implements OnInit {

  requests: ResidentRequestRow[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  private actioningId: string | null = null;

  constructor(
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadRequests();
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
      status: request.status as ResidentRequestRow['status'],
      statusLabel: this.statusLabel(request.status)
    };
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
      next: () => {
        this.actioningId = null;
        request.status = request.status === 'PENDING' && successText.includes('rejected') ? 'REJECTED' : 'APPROVED';
        request.statusLabel = request.status === 'REJECTED' ? 'Rejected' : 'Approved';
        this.successMessage = successText;
        this.cdr.detectChanges();
      },
      error: error => {
        this.actioningId = null;
        this.errorMessage = error?.error?.message || 'The action could not be completed.';
        this.cdr.detectChanges();
      }
    });
  }
}