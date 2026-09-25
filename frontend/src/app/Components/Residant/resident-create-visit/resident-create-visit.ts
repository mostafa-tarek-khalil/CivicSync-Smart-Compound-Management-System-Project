import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VisitService, VisitRecord } from '../../../Services/visit-service';

interface VisitRow {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitDate: string;
  startTime: string;
  purpose: string;
  status: string;
  statusLabel: string;
}

/**
 * Resident-side visitor invite. The backend already exposes `POST /visits`
 * (resident-only, `RESIDENT_INVITE`) which derives the building and unit from
 * the resident's own profile — this page is that endpoint's UI: the resident
 * fills in the visitor details and the visit slot, and the requested visit is
 * created straight away.
 */
@Component({
  selector: 'app-resident-create-visit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resident-create-visit.html',
  styleUrl: './resident-create-visit.css'
})
export class ResidentCreateVisit implements OnInit {

  form = {
    visitorName: '',
    visitorEmail: '',
    visitorPhone: '',
    visitDate: '',
    visitStartTime: '',
    purpose: ''
  };

  submitting = false;
  loadingVisits = false;
  errorMessage = '';
  successMessage = '';

  visits: VisitRow[] = [];

  minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  constructor(
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadVisits();
  }

  loadVisits(): void {
    this.loadingVisits = true;
    this.visitService.getMyVisits().subscribe({
      next: response => {
        this.visits = (response.data || []).map(visit => this.toRow(visit));
        this.loadingVisits = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.visits = [];
        this.loadingVisits = false;
        this.cdr.detectChanges();
      }
    });
  }

  submit(): void {
    if (this.submitting) {
      return;
    }

    const validation = this.validate();
    if (validation) {
      this.errorMessage = validation;
      this.successMessage = '';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.visitService.createVisit({
      visitorName: this.form.visitorName.trim(),
      visitorEmail: this.form.visitorEmail.trim().toLowerCase(),
      visitorPhone: this.form.visitorPhone.trim() || undefined,
      visitDate: this.form.visitDate,
      visitStartTime: this.form.visitStartTime,
      purpose: this.form.purpose.trim() || undefined
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage =
          `Invitation created for ${this.form.visitorName.trim()}. ` +
          `The visit details were emailed to ${this.form.visitorEmail.trim().toLowerCase()}.`;
        this.resetForm();
        this.loadVisits();
        this.cdr.detectChanges();
      },
      error: error => {
        this.submitting = false;
        this.errorMessage = error?.error?.message || 'Could not create the visit.';
        this.cdr.detectChanges();
      }
    });
  }

  private validate(): string | null {
    if (!this.form.visitorName.trim()) {
      return 'Enter the visitor name.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.visitorEmail.trim())) {
      return 'Enter a valid visitor email address.';
    }
    if (!this.form.visitDate) {
      return 'Choose a visit date.';
    }
    if (!this.form.visitStartTime) {
      return 'Choose a visit start time.';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visitDate = new Date(`${this.form.visitDate}T00:00:00`);
    if (Number.isNaN(visitDate.getTime()) || visitDate < today) {
      return 'Choose today or a future date for the visit.';
    }

    return null;
  }

  private resetForm(): void {
    this.form = {
      visitorName: '',
      visitorEmail: '',
      visitorPhone: '',
      visitDate: '',
      visitStartTime: '',
      purpose: ''
    };
  }

  private toRow(visit: VisitRecord): VisitRow {
    return {
      id: visit._id,
      visitorName: visit.visitorName,
      visitorEmail: visit.visitorEmail,
      visitDate: this.formatDate(visit.visitDate),
      startTime: visit.visitStartTime,
      purpose: visit.purpose || 'Visit',
      status: visit.status,
      statusLabel: this.statusLabel(visit.status)
    };
  }

  private statusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'APPROVED': return 'Approved';
      case 'QR_GENERATED': return 'QR Ready';
      case 'QR_SCANNED': return 'QR Scanned';
      case 'CHECKED_IN': return 'Checked In';
      case 'CHECKED_OUT': return 'Checked Out';
      case 'EXPIRED': return 'Expired';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }

  private formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}