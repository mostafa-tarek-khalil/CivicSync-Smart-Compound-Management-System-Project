
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService, VisitRecord } from '../../../../../Services/visit-service';
import {
  toSecurityStatus,
  formatDate,
  formatTime,
  residentLabel,
  buildingLabel,
  unitLabel
} from '../../../services/visit-status.util';

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

  buildingName = '';
  unitNumber = '';

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
      this.router.navigate(['/security/visitors/list']);
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

    this.buildingName = buildingLabel(visit);
    this.unitNumber = unitLabel(visit);

    this.visitDate = formatDate(visit.visitDate);
    this.startTime = visit.visitStartTime;
    this.purpose = visit.purpose || 'Visit';

    this.visitStatus = toSecurityStatus(visit.status);
    this.qrStatus =
      visit.status === 'QR_GENERATED'
        ? 'Valid'
        : visit.status === 'QR_SCANNED'
        ? 'Scanned'
        : visit.status === 'EXPIRED'
        ? 'Expired'
        : 'Used';

    this.checkInTime = formatTime(visit.checkedInAt);
    this.checkOutTime = formatTime(visit.checkedOutAt);

    // NOTE: security views someone else's visit here, so we do not push this
    // data into the visitor's tracked-visit store.
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
      '/security/visitors/list'
    ]);

  }


  // =========================
  // SCAN AGAIN
  // =========================

  scanAgain(): void {

    this.router.navigate([
      '/security/visitors/scanner'
    ]);

  }


  // =========================
  // CHECK IN / OUT
  // =========================

  openCheckInOut(): void {

    this.router.navigate([
      '/security/visitors/check-in-out'
    ], {
      queryParams: {
        visitId: this.visitId
      }
    });

  }

}
