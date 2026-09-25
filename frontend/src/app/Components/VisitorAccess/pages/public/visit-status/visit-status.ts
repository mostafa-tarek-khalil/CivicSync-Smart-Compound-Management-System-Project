import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService } from '../../../../../Services/visit-service';

@Component({
  selector: 'app-visit-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visit-status.html',
  styleUrl: './visit-status.css'
})
export class VisitStatus implements OnInit, OnDestroy {
  visitorName = '';
  visitorEmail = '';
  residentName = '';
  building = '';
  unit = '';
  visitDate = '';
  startTime = '';
  purpose = '';
  requestId = '';
  currentStatus = '';

  private refreshTimer?: ReturnType<typeof setInterval>;
  private isLoadingStatus = false;
  private isRedirecting = false;

  steps = [
    {
      title: 'Request Submitted',
      description:
        'Your visitor request has been submitted successfully.',
      state: 'completed',
      symbol: '✓'
    },
    {
      title: 'Email Verified',
      description:
        'The visitor email address has been verified.',
      state: 'completed',
      symbol: '✓'
    },
    {
      title: 'Pending Approval',
      description:
        'Your request was waiting for resident approval.',
      state: 'upcoming',
      symbol: '3'
    },
    {
      title: 'Approved',
      description:
        'The visit request has been approved.',
      state: 'upcoming',
      symbol: '4'
    },
    {
      title: 'QR Generated',
      description:
        'Your visitor QR pass is ready to use.',
      state: 'upcoming',
      symbol: '5'
    },
    {
      title: 'Checked In',
      description:
        'Security will complete this step when you arrive.',
      state: 'upcoming',
      symbol: '6'
    },
    {
      title: 'Checked Out',
      description:
        'This step will be completed when your visit ends.',
      state: 'upcoming',
      symbol: '7'
    }
  ];

  constructor(
    private router: Router,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const visit =
      this.visitorFlow.getVisit();

    if (
      !visit.requestId ||
      !visit.visitorEmail
    ) {
      this.router.navigate([
        '/visitor-lookup'
      ]);
      return;
    }

    this.loadVisitData();
    this.loadStatus();

    this.refreshTimer = setInterval(() => {
      if (!this.isRedirecting) {
        this.loadStatus();
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(
        this.refreshTimer
      );

      this.refreshTimer =
        undefined;
    }
  }

  loadVisitData(): void {
    const visit =
      this.visitorFlow.getVisit();

    this.visitorName =
      visit.visitorName || '';

    this.visitorEmail =
      visit.visitorEmail || '';

    this.residentName =
      visit.residentName || '';

    this.building =
      visit.building || '';

    this.unit =
      visit.unit || '';

    this.visitDate =
      visit.visitDate || '';

    this.startTime =
      visit.startTime || '';

    this.purpose =
      visit.purpose || '';

    this.requestId =
      visit.requestId || '';

    this.currentStatus =
      this.toDisplayStatus(
        visit.status
      );

    this.updateSteps();
  }

  loadStatus(): void {
    if (
      this.isLoadingStatus ||
      this.isRedirecting
    ) {
      return;
    }

    const saved =
      this.visitorFlow.getVisit();

    if (
      !saved.requestId ||
      !saved.visitorEmail
    ) {
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
            this.cdr.detectChanges();
            return;
          }

          const data =
            response.data;

          const building =
            typeof data.buildingId === 'object'
              ? data.buildingId
              : null;

          const unit =
            typeof data.unitId === 'object'
              ? data.unitId
              : null;

          const resident =
            typeof data.residentId === 'object'
              ? data.residentId
              : null;

          const status =
            String(
              data.status || ''
            ).toUpperCase();

          this.visitorName =
            data.visitorName ||
            saved.visitorName ||
            '';

          this.visitorEmail =
            data.visitorEmail ||
            saved.visitorEmail ||
            '';

          this.residentName =
            resident?.name ||
            saved.residentName ||
            '';

          this.building =
            building?.name ||
            saved.building ||
            '';

          this.unit =
            unit?.unitNumber != null
              ? String(
                  unit.unitNumber
                )
              : saved.unit || '';

          this.visitDate =
            data.visitDate ||
            saved.visitDate ||
            '';

          this.startTime =
            data.visitStartTime ||
            saved.startTime ||
            '';

          this.purpose =
            data.purpose ||
            saved.purpose ||
            '';

          this.requestId =
            saved.requestId;

          this.currentStatus =
            this.toDisplayStatus(
              status
            );

          this.visitorFlow.updateVisit({
            visitorName:
              this.visitorName,

            visitorEmail:
              this.visitorEmail,

            residentName:
              this.residentName,

            building:
              this.building,

            unit:
              this.unit,

            buildingId:
              building?._id ||
              saved.buildingId,

            unitId:
              unit?._id ||
              saved.unitId,

            visitDate:
              this.visitDate,

            startTime:
              this.startTime,

            purpose:
              this.purpose,

            status,

            qrExpiresAt:
              data.qrExpiresAt ||
              saved.qrExpiresAt ||
              '',

            checkInTime:
              data.checkedInAt ||
              saved.checkInTime ||
              '',

            checkOutTime:
              data.checkedOutAt ||
              saved.checkOutTime ||
              '',

            visitorChatToken:
              data.visitorChatToken ||
              saved.visitorChatToken ||
              ''
          });

          this.updateSteps();

          this.cdr.detectChanges();

          this.handleAutomaticNavigation(
            status
          );
        },

        error: error => {
          this.isLoadingStatus = false;

          console.error(
            'Visit status refresh failed:',
            error
          );

          this.cdr.detectChanges();
        }
      });
  }

  private handleAutomaticNavigation(
    status: string
  ): void {
    if (this.isRedirecting) {
      return;
    }

    switch (status) {
      case 'APPROVED':
      case 'QR_GENERATED':
        this.isRedirecting = true;

        if (this.refreshTimer) {
          clearInterval(
            this.refreshTimer
          );

          this.refreshTimer =
            undefined;
        }

        this.router.navigate([
          '/qr-code-display'
        ]);
        break;

      case 'CHECKED_IN':
        this.isRedirecting = true;

        if (this.refreshTimer) {
          clearInterval(
            this.refreshTimer
          );

          this.refreshTimer =
            undefined;
        }

        this.router.navigate([
          '/visit-in-progress'
        ]);
        break;

      default:
        break;
    }
  }

  private toDisplayStatus(
    status: string
  ): string {
    const labels: Record<
      string,
      string
    > = {
      PENDING:
        'Pending Approval',

      APPROVED:
        'Approved',

      QR_GENERATED:
        'QR Generated',

      CHECKED_IN:
        'Checked In',

      CHECKED_OUT:
        'Checked Out',

      REJECTED:
        'Rejected',

      EXPIRED:
        'Expired'
    };

    return (
      labels[status] ||
      status
    );
  }

  updateSteps(): void {
    const visit =
      this.visitorFlow.getVisit();

    const status =
      String(
        visit.status || ''
      ).toUpperCase();

    const statusOrder = [
      'PENDING',
      'APPROVED',
      'QR_GENERATED',
      'CHECKED_IN',
      'CHECKED_OUT'
    ];

    const currentIndex =
      statusOrder.indexOf(
        status
      );

    this.steps[2].state =
      currentIndex >= 0
        ? 'completed'
        : 'upcoming';

    this.steps[3].state =
      currentIndex >= 1
        ? 'completed'
        : 'upcoming';

    this.steps[4].state =
      currentIndex >= 2
        ? 'active'
        : 'upcoming';

    this.steps[5].state =
      currentIndex >= 3
        ? 'active'
        : 'upcoming';

    this.steps[6].state =
      currentIndex >= 4
        ? 'active'
        : 'upcoming';

    if (status === 'PENDING') {
      this.steps[2].state =
        'active';
    }

    if (status === 'APPROVED') {
      this.steps[3].state =
        'active';

      this.steps[4].state =
        'upcoming';
    }

    if (
      status === 'QR_GENERATED'
    ) {
      this.steps[3].state =
        'completed';

      this.steps[4].state =
        'active';
    }

    if (
      status === 'CHECKED_IN'
    ) {
      this.steps[4].state =
        'completed';

      this.steps[5].state =
        'active';
    }

    if (
      status === 'CHECKED_OUT'
    ) {
      this.steps[4].state =
        'completed';

      this.steps[5].state =
        'completed';

      this.steps[6].state =
        'active';
    }

    if (
      status === 'REJECTED' ||
      status === 'EXPIRED'
    ) {
      this.steps[2].state =
        status === 'REJECTED'
          ? 'active'
          : 'upcoming';
    }
  }

  viewQrPass(): void {
    const visit =
      this.visitorFlow.getVisit();

    if (
      visit.status !==
        'QR_GENERATED' &&
      visit.status !== 'APPROVED'
    ) {
      return;
    }

    this.router.navigate([
      '/qr-code-display'
    ]);
  }

  backToRequest(): void {
    this.router.navigate([
      '/visitor-request-status'
    ]);
  }
}