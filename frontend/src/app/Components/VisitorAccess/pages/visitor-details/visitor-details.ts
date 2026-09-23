
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VisitorFlow } from '../../services/visitor-flow';
import { VisitService, VisitRecord } from '../../../../Services/visit-service';
import {
  toSecurityStatus,
  formatDate,
  formatTime,
  residentLabel
} from '../../services/visit-status.util';

@Component({
  selector: 'app-visitor-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visitor-details.html',
  styleUrl: './visitor-details.css'
})
export class VisitorDetails implements OnInit {

  visitorName = '';
  visitorEmail = '';
  visitorPhone = '';

  residentName = '';

  visitDate = '';
  startTime = '';
  purpose = '';

  qrStatus = '';
  visitStatus = '';

  checkInTime = '';
  checkOutTime = '';

  visitId = '';
  loading = false;
  errorMessage = '';


  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {
    this.visitId = this.route.snapshot.queryParamMap.get('visitId') || this.visitorFlow.getVisit().requestId;

    if (!this.visitId) {
      this.router.navigate(['/security-visits']);
      return;
    }

    this.loadVisit();
  }

  loadVisit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.visitService.getSecurityVisit(this.visitId).subscribe({
      next: response => {
        this.applyVisit(response.data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Could not load the visitor details.';
        this.cdr.detectChanges();
      }
    });
  }

  private applyVisit(visit: VisitRecord): void {
    this.visitorName = visit.visitorName;
    this.visitorEmail = visit.visitorEmail;
    this.visitorPhone = visit.visitorPhone || '-';

    this.residentName = residentLabel(visit);

    this.visitDate = formatDate(visit.visitDate);
    this.startTime = visit.visitStartTime;
    this.purpose = visit.purpose || 'Visit';

    this.visitStatus = toSecurityStatus(visit.status);
    this.qrStatus = visit.status === 'QR_GENERATED' ? 'Valid' : visit.status === 'EXPIRED' ? 'Expired' : 'Used';

    this.checkInTime = formatTime(visit.checkedInAt);
    this.checkOutTime = formatTime(visit.checkedOutAt);

    this.visitorFlow.updateVisit({
      requestId: visit._id,
      visitorName: visit.visitorName,
      visitorEmail: visit.visitorEmail,
      visitorPhone: visit.visitorPhone || '',
      residentName: this.residentName,
      building: typeof visit.buildingId === 'object' && visit.buildingId ? visit.buildingId.name : '',
      unit: typeof visit.unitId === 'object' && visit.unitId ? String(visit.unitId.unitNumber) : '',
      visitDate: this.visitDate,
      startTime: this.startTime,
      purpose: this.purpose,
      qrStatus: this.qrStatus === 'Valid' ? 'Valid' : 'Already Used',
      visitStatus: this.toFlowStatus(visit.status),
      checkInTime: visit.checkedInAt ? this.checkInTime : '',
      checkOutTime: visit.checkedOutAt ? this.checkOutTime : ''
    });
  }

  private toFlowStatus(status: string): 'Pending Approval' | 'Approved' | 'QR Generated' | 'Checked In' | 'Checked Out' | 'Rejected' | 'Expired' {
    switch (status) {
      case 'QR_GENERATED':
        return 'QR Generated';
      case 'CHECKED_IN':
        return 'Checked In';
      case 'CHECKED_OUT':
        return 'Checked Out';
      case 'REJECTED':
        return 'Rejected';
      case 'EXPIRED':
        return 'Expired';
      case 'APPROVED':
        return 'Approved';
      case 'PENDING':
      default:
        return 'Pending Approval';
    }
  }


  // =========================
  // BACK
  // =========================

  goBack(): void {

    this.router.navigate([
      '/security-visits'
    ]);

  }


  // =========================
  // SCAN AGAIN
  // =========================

  scanAgain(): void {

    this.router.navigate([
      '/qr-scanner'
    ]);

  }


  // =========================
  // CHECK IN / OUT
  // =========================

  openCheckInOut(): void {

    this.router.navigate([
      '/check-in-out'
    ], {
      queryParams: {
        visitId: this.visitId
      }
    });

  }

}
