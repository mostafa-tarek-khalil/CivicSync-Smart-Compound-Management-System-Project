import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService } from '../../../../../Services/visit-service';

@Component({
  selector: 'app-visitor-request-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visitor-request-status.html',
  styleUrl: './visitor-request-status.css'
})
export class VisitorRequestStatus implements OnInit, OnDestroy {
  visitor = {
    fullName: '',
    phone: '',
    email: ''
  };

  visit = {
    building: '',
    unit: '',
    date: '',
    time: '',
    purpose: ''
  };

  status = '';
  requestId = '';
  statusDescription = '';
  errorMessage = '';
  canChat = false;

  private refreshTimer?: ReturnType<typeof setInterval>;
  private isLoadingStatus = false;
  private isRedirecting = false;
  private openedFromQr = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.openedFromQr =
      this.route.snapshot.queryParamMap.get('fromQr') === 'true';

    const saved = this.visitorFlow.getVisit();

    if (!saved.requestId || !saved.visitorEmail) {
      this.router.navigate(['/visitor-lookup']);
      return;
    }

    this.applySavedVisit(saved);
    this.loadStatus();

    this.refreshTimer = setInterval(() => {
      if (!this.isRedirecting) {
        this.loadStatus();
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    this.clearRefreshTimer();
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  private applySavedVisit(data: any): void {
    this.visitor = {
      fullName: data.visitorName || '',
      phone: data.visitorPhone || '',
      email: data.visitorEmail || ''
    };

    this.visit = {
      building: data.building || '',
      unit: data.unit || '',
      date: data.visitDate || '',
      time: data.startTime || '',
      purpose: data.purpose || ''
    };

    this.status = this.toViewStatus(data.status);
    this.requestId = data.requestId || '';
    this.statusDescription = this.describeStatus(this.status);
    this.canChat = !!data.visitorChatToken;
  }

  private toViewStatus(status: string): string {
    const statuses: Record<string, string> = {
      PENDING: 'Pending Approval',
      APPROVED: 'Approved',
      QR_GENERATED: 'QR Generated',
      CHECKED_IN: 'Checked In',
      CHECKED_OUT: 'Checked Out',
      REJECTED: 'Rejected',
      EXPIRED: 'Expired'
    };

    return statuses[status] || status;
  }

  private describeStatus(status: string): string {
    switch (status) {
      case 'Rejected':
        return 'The resident rejected this visit request.';

      case 'Approved':
        return 'The resident approved your request. Your QR pass is ready.';

      case 'QR Generated':
        return 'Your visitor QR pass is ready. Show it to security when you arrive.';

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

  loadStatus(): void {
    if (this.isLoadingStatus || this.isRedirecting) {
      return;
    }

    const saved = this.visitorFlow.getVisit();

    if (!saved.requestId || !saved.visitorEmail) {
      return;
    }

    this.isLoadingStatus = true;

    this.visitService
      .getVisitorStatus(
        saved.requestId,
        saved.visitorEmail
      )
      .subscribe({
        next: response => {
          this.isLoadingStatus = false;

          if (
            !response ||
            !response.success ||
            !response.data
          ) {
            this.errorMessage =
              'Could not refresh the visitor request status.';

            this.cdr.detectChanges();
            return;
          }

          const visit = response.data;

          const building =
            typeof visit.buildingId === 'object'
              ? visit.buildingId
              : null;

          const unit =
            typeof visit.unitId === 'object'
              ? visit.unitId
              : null;

          const resident =
            typeof visit.residentId === 'object'
              ? visit.residentId
              : null;

          const latestStatus =
            String(
              visit.status || ''
            ).toUpperCase();

          const viewStatus =
            this.toViewStatus(latestStatus);

          this.status = viewStatus;
          this.statusDescription =
            this.describeStatus(viewStatus);

          this.requestId =
            saved.requestId;

          this.visitor = {
            fullName:
              visit.visitorName ||
              saved.visitorName ||
              '',
            phone:
              visit.visitorPhone ||
              saved.visitorPhone ||
              '',
            email:
              visit.visitorEmail ||
              saved.visitorEmail ||
              ''
          };

          this.visit = {
            building:
              building?.name ||
              saved.building ||
              '',
            unit:
              unit?.unitNumber != null
                ? String(unit.unitNumber)
                : saved.unit || '',
            date:
              visit.visitDate ||
              saved.visitDate ||
              '',
            time:
              visit.visitStartTime ||
              saved.startTime ||
              '',
            purpose:
              visit.purpose ||
              saved.purpose ||
              ''
          };

          this.visitorFlow.updateVisit({
            visitorName:
              visit.visitorName ||
              saved.visitorName ||
              '',

            visitorEmail:
              visit.visitorEmail ||
              saved.visitorEmail ||
              '',

            visitorPhone:
              visit.visitorPhone ||
              saved.visitorPhone ||
              '',

            residentName:
              resident?.name ||
              saved.residentName ||
              '',

            building:
              building?.name ||
              saved.building ||
              '',

            unit:
              unit?.unitNumber != null
                ? String(unit.unitNumber)
                : saved.unit || '',

            buildingId:
              building?._id ||
              saved.buildingId,

            unitId:
              unit?._id ||
              saved.unitId,

            visitDate:
              visit.visitDate ||
              saved.visitDate ||
              '',

            startTime:
              visit.visitStartTime ||
              saved.startTime ||
              '',

            purpose:
              visit.purpose ||
              saved.purpose ||
              '',

            status:
              latestStatus,

            qrExpiresAt:
              visit.qrExpiresAt ||
              saved.qrExpiresAt ||
              '',

            checkInTime:
              visit.checkedInAt ||
              saved.checkInTime ||
              '',

            checkOutTime:
              visit.checkedOutAt ||
              saved.checkOutTime ||
              '',

            visitorChatToken:
              visit.visitorChatToken ||
              saved.visitorChatToken ||
              ''
          });

          this.canChat =
            !!visit.visitorChatToken ||
            !!saved.visitorChatToken;

          this.errorMessage = '';

          this.cdr.detectChanges();

          this.handleAutomaticNavigation(
            latestStatus
          );
        },

        error: error => {
          this.isLoadingStatus = false;

          this.errorMessage =
            error?.error?.message ||
            'Could not refresh the visitor request status.';

          this.cdr.detectChanges();
        }
      });
  }

  private handleAutomaticNavigation(
    status: string
  ): void {
    if (
      this.isRedirecting ||
      this.openedFromQr
    ) {
      return;
    }

    switch (status) {
      case 'APPROVED':
      case 'QR_GENERATED':
        this.isRedirecting = true;
        this.clearRefreshTimer();

        this.router.navigate([
          '/qr-code-display'
        ]);
        break;

      case 'CHECKED_IN':
        this.isRedirecting = true;
        this.clearRefreshTimer();

        this.router.navigate([
          '/visit-in-progress'
        ]);
        break;

      default:
        break;
    }
  }

  viewVisitorRequest(): void {
    this.router.navigate([
      '/visitor-entry'
    ]);
  }

  trackAnother(): void {
    this.router.navigate([
      '/visitor-lookup'
    ]);
  }

  viewVisitorQr(): void {
    const data =
      this.visitorFlow.getVisit();

    const status =
      String(
        data.status || ''
      ).toUpperCase();

    if (
      status !== 'APPROVED' &&
      status !== 'QR_GENERATED'
    ) {
      return;
    }

    this.router.navigate([
      '/qr-code-display'
    ]);
  }

  openChat(): void {
    this.router.navigate([
      '/visitor-chat'
    ]);
  }
}