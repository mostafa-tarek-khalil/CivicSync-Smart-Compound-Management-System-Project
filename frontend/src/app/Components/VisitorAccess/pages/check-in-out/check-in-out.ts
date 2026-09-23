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
  selector: 'app-check-in-out',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './check-in-out.html',
  styleUrl: './check-in-out.css'
})
export class CheckInOut implements OnInit {

  visitorName = '';
  residentName = '';
  visitDate = '';
  startTime = '';
  purpose = '';

  visitStatus = '';

  checkInTime = '';
  checkOutTime = '';

  visitId = '';
  loading = false;
  actionLoading = false;
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

    this.loadVisitData();
  }

  loadVisitData(): void {
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
        this.errorMessage = error?.error?.message || 'Could not load the visit.';
        this.cdr.detectChanges();
      }
    });
  }

  private applyVisit(visit: VisitRecord): void {
    this.visitorName = visit.visitorName;
    this.residentName = residentLabel(visit);
    this.visitDate = formatDate(visit.visitDate);
    this.startTime = visit.visitStartTime;
    this.purpose = visit.purpose || 'Visit';

    this.visitStatus = toSecurityStatus(visit.status);
    this.checkInTime = visit.checkedInAt ? formatTime(visit.checkedInAt) : '';
    this.checkOutTime = visit.checkedOutAt ? formatTime(visit.checkedOutAt) : '';

    this.visitorFlow.updateVisit({
      requestId: visit._id,
      visitorName: visit.visitorName,
      residentName: this.residentName,
      visitDate: this.visitDate,
      startTime: this.startTime,
      purpose: this.purpose,
      visitStatus: visit.status === 'CHECKED_OUT'
        ? 'Checked Out'
        : visit.status === 'CHECKED_IN'
        ? 'Checked In'
        : 'QR Generated',
      checkInTime: this.checkInTime,
      checkOutTime: this.checkOutTime
    });
  }

  checkIn(): void {
    if (this.actionLoading || !this.visitId) {
      return;
    }
    this.actionLoading = true;
    this.errorMessage = '';
    this.visitService.checkIn(this.visitId).subscribe({
      next: () => {
        this.actionLoading = false;
        this.loadVisitData();
      },
      error: error => {
        this.actionLoading = false;
        this.errorMessage = error?.error?.message || 'Could not check the visitor in.';
        this.cdr.detectChanges();
      }
    });
  }

  checkOut(): void {
    if (this.actionLoading || !this.visitId) {
      return;
    }
    this.actionLoading = true;
    this.errorMessage = '';
    this.visitService.checkOut(this.visitId).subscribe({
      next: () => {
        this.actionLoading = false;
        this.loadVisitData();
      },
      error: error => {
        this.actionLoading = false;
        this.errorMessage = error?.error?.message || 'Could not check the visitor out.';
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/visitor-details'], { queryParams: { visitId: this.visitId } });
  }

  goToVisitors(): void {
    this.router.navigate(['/security-visits']);
  }
}