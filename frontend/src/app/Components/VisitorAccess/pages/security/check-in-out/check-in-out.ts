import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService, VisitRecord } from '../../../../../Services/visit-service';
import {
  toSecurityStatus,
  formatDate,
  formatTime,
  residentLabel
} from '../../../services/visit-status.util';

/** One selectable row in the picker shown when no visit is pre-selected. */
interface CheckInOutCandidate {
  id: string;
  visitorName: string;
  residentName: string;
  visitDate: string;
  startTime: string;
  action: 'in' | 'out';
}

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

  /**
   * True when the page was opened without a specific visit (e.g. from the
   * security sidebar). Instead of bouncing back to the visitor list, it acts as
   * a picker: security chooses which visitor to check in or out.
   */
  pickerMode = false;
  candidatesLoading = false;
  candidates: CheckInOutCandidate[] = [];

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
      // Opened directly (sidebar / bookmark) with no visit chosen yet: show the
      // list of visitors awaiting a check-in or check-out instead of redirecting.
      this.pickerMode = true;
      this.loadCandidates();
      return;
    }

    this.loadVisitData();
  }

  /** Visits that can still be checked in or out right now. */
  loadCandidates(): void {
    this.candidatesLoading = true;
    this.errorMessage = '';

    this.visitService.getSecurityVisits().subscribe({
      next: response => {
        this.candidates = (response.data || [])
          .map(visit => this.toCandidate(visit))
          .filter((candidate): candidate is CheckInOutCandidate => candidate !== null);
        this.candidatesLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.candidatesLoading = false;
        this.errorMessage = error?.error?.message || 'Could not load visitors.';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * A visit only needs this page while it is moving through the gate:
   * APPROVED / QR_GENERATED / QR_SCANNED can be checked in, CHECKED_IN can be
   * checked out. Finished or pending visits are not actionable here.
   */
  private toCandidate(visit: VisitRecord): CheckInOutCandidate | null {
    let action: 'in' | 'out';

    switch (visit.status) {
      case 'APPROVED':
      case 'QR_GENERATED':
      case 'QR_SCANNED':
        action = 'in';
        break;
      case 'CHECKED_IN':
        action = 'out';
        break;
      default:
        return null;
    }

    return {
      id: visit._id,
      visitorName: visit.visitorName,
      residentName: residentLabel(visit),
      visitDate: formatDate(visit.visitDate),
      startTime: visit.visitStartTime,
      action
    };
  }

  /** Security picked a visitor from the list. */
  selectVisit(id: string): void {
    this.visitId = id;
    this.pickerMode = false;
    this.loadVisitData();
  }

  /** Return to the picker from a specific visit. */
  changeVisitor(): void {
    this.visitId = '';
    this.pickerMode = true;
    this.loadCandidates();
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

    // NOTE: security is acting on a visitor's visit; we do not write into the
    // visitor's tracked-visit store from here.
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
    if (this.pickerMode) {
      this.router.navigate(['/security/visitors']);
      return;
    }

    this.router.navigate(['/security/visitors/details'], { queryParams: { visitId: this.visitId } });
  }

  goToVisitors(): void {
    this.router.navigate(['/security/visitors/list']);
  }
}