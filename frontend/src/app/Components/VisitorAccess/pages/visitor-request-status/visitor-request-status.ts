import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VisitorFlow } from '../../services/visitor-flow';
import { VisitService, VisitRecord } from '../../../../Services/visit-service';

@Component({
  selector: 'app-visitor-request-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visitor-request-status.html',
  styleUrl: './visitor-request-status.css'
})
export class VisitorRequestStatus implements OnInit, OnDestroy {

  // =========================
  // VISITOR DATA
  // =========================

  visitor = {
    fullName: '',
    phone: '',
    email: ''
  };


  // =========================
  // VISIT DATA
  // =========================

  visit = {
    building: '',
    unit: '',
    date: '',
    time: '',
    purpose: ''
  };


  // =========================
  // STATUS
  // =========================

  status = '';
  requestId = '';
  statusDescription = '';
  errorMessage = '';
  private refreshTimer?: ReturnType<typeof setInterval>;


  // =========================
  // CONSTRUCTOR
  // =========================

  constructor(
    private router: Router,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService
  ) {

    // Get visitor data from shared mock service
    const data = this.visitorFlow.getVisit();

    // Visitor
    this.visitor = {
      fullName: data.visitorName,
      phone: data.visitorPhone,
      email: data.visitorEmail
    };

    // Visit
    this.visit = {
      building: data.building,
      unit: data.unit,
      date: data.visitDate,
      time: data.startTime,
      purpose: data.purpose
    };

    this.status = data.visitStatus;
    this.requestId = data.requestId;
    this.statusDescription = this.describeStatus(data.visitStatus);
  }

  private describeStatus(status: string): string {
    switch (status) {
      case 'Rejected':
        return 'The resident rejected this visit request.';
      case 'Approved':
      case 'QR Generated':
        return 'The resident approved your request. Your QR pass is ready.';
      case 'Checked In':
        return 'You have checked in. Enjoy your visit.';
      case 'Checked Out':
        return 'Your visit has been completed.';
      case 'Expired':
        return 'This visitor pass has expired.';
      case 'Pending Approval':
      default:
        return 'Your request has been submitted and is waiting for resident approval.';
    }
  }

  ngOnInit(): void {
    const saved = this.visitorFlow.getVisit();
    if (!saved.requestId || !saved.visitorEmail) {
      this.router.navigate(['/visitor-request']);
      return;
    }
    this.loadStatus();
    this.refreshTimer = setInterval(() => {
      if (this.status === 'Pending Approval') this.loadStatus();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  loadStatus(): void {
    const saved = this.visitorFlow.getVisit();
    this.visitService.getVisitorStatus(saved.requestId, saved.visitorEmail).subscribe({
      next: response => {
        const visit = response.data;
        const building = typeof visit.buildingId === 'object' ? visit.buildingId : null;
        const unit = typeof visit.unitId === 'object' ? visit.unitId : null;
        const resident = typeof visit.residentId === 'object' ? visit.residentId : null;
        const viewStatus = this.toViewStatus(visit.status);
        this.status = viewStatus;
        this.statusDescription = this.describeStatus(viewStatus);
        this.visitor = {
          fullName: visit.visitorName,
          phone: visit.visitorPhone || '',
          email: visit.visitorEmail
        };
        this.visit = {
          building: building?.name || saved.building,
          unit: unit?.unitNumber != null ? String(unit.unitNumber) : saved.unit,
          date: visit.visitDate,
          time: visit.visitStartTime,
          purpose: visit.purpose || ''
        };
        this.visitorFlow.updateVisit({
          visitorName: visit.visitorName,
          visitorEmail: visit.visitorEmail,
          visitorPhone: visit.visitorPhone || '',
          residentName: resident?.name || '',
          building: building?.name || saved.building,
          unit: unit?.unitNumber != null ? String(unit.unitNumber) : saved.unit,
          buildingId: building?._id || saved.buildingId,
          unitId: unit?._id || saved.unitId,
          visitDate: visit.visitDate,
          startTime: visit.visitStartTime,
          purpose: visit.purpose || '',
          visitStatus: viewStatus as any,
          requestStatus: visit.status === 'REJECTED' ? 'Rejected' : visit.status === 'PENDING' ? 'Pending' : 'Approved',
          qrStatus: visit.status === 'QR_GENERATED' ? 'Valid' : visit.status === 'EXPIRED' ? 'Expired' : 'Not Generated',
          qrExpiration: visit.qrExpiresAt || ''
        });
        this.errorMessage = '';
      },
      error: error => {
        this.errorMessage = error?.error?.message || 'Could not refresh the visitor request status.';
      }
    });
  }

  private toViewStatus(status: string): string {
    const statuses: Record<string, string> = {
      PENDING: 'Pending Approval', APPROVED: 'Approved', QR_GENERATED: 'QR Generated',
      CHECKED_IN: 'Checked In', CHECKED_OUT: 'Checked Out', REJECTED: 'Rejected', EXPIRED: 'Expired'
    };
    return statuses[status] || status;
  }


  // =========================
  // BACK TO REQUEST
  // =========================

  viewVisitorRequest(): void {
    this.router.navigate(['/visitor-entry']);
  }

  trackAnother(): void {
    this.router.navigate(['/visitor-lookup']);
  }


  // =========================
  // VIEW QR
  // =========================

  viewVisitorQr(): void {

    const data = this.visitorFlow.getVisit();

    if (data.visitStatus !== 'QR Generated') {
      return;
    }

    this.router.navigate(['/qr-code-display']);
  }

}
