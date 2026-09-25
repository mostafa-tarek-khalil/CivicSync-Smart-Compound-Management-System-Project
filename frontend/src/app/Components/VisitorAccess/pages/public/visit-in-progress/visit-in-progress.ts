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
  selector: 'app-visit-in-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visit-in-progress.html',
  styleUrl: './visit-in-progress.css'
})
export class VisitInProgress
  implements OnInit, OnDestroy {

  visitorName = '';
  residentName = '';
  building = '';
  unit = '';
  visitDate = '';
  startTime = '';
  purpose = '';
  requestId = '';
  checkInTime = '';
  status = '';
  checkOutTime = '';
  canChat = false;
  loading = true;
  errorMessage = '';

  private refreshTimer?: ReturnType<
    typeof setInterval
  >;

  private isLoadingStatus = false;

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

    this.applyVisit();
    this.loadStatus();

    this.refreshTimer =
      setInterval(() => {
        if (
          !this.isLoadingStatus &&
          !this.isCheckedOut
        ) {
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

  private applyVisit(): void {
    const visit =
      this.visitorFlow.getVisit();

    this.visitorName =
      visit.visitorName || '';

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

    this.checkInTime =
      visit.checkInTime || '';

    this.checkOutTime =
      visit.checkOutTime || '';

    this.status =
      visit.status || '';

    this.canChat =
      !!visit.visitorChatToken;
  }

  loadStatus(): void {
    if (this.isLoadingStatus) {
      return;
    }

    const visit =
      this.visitorFlow.getVisit();

    if (
      !visit.requestId ||
      !visit.visitorEmail
    ) {
      return;
    }

    this.isLoadingStatus = true;

    this.visitService
      .getVisitorStatus(
        visit.requestId,
        visit.visitorEmail
      )
      .subscribe({
        next: response => {
          this.isLoadingStatus = false;

          if (
            !response ||
            !response.success ||
            !response.data
          ) {
            this.loading = false;
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

          this.visitorFlow.updateVisit({
            status:
              data.status ||
              visit.status,

            visitorChatToken:
              data.visitorChatToken ||
              visit.visitorChatToken ||
              '',

            checkInTime:
              data.checkedInAt ||
              visit.checkInTime ||
              '',

            checkOutTime:
              data.checkedOutAt ||
              '',

            residentName:
              resident?.name ||
              visit.residentName ||
              '',

            building:
              building?.name ||
              visit.building ||
              '',

            unit:
              unit?.unitNumber != null
                ? String(
                    unit.unitNumber
                  )
                : visit.unit || ''
          });

          this.applyVisit();

          this.loading = false;
          this.errorMessage = '';

          this.cdr.detectChanges();
        },

        error: error => {
          this.isLoadingStatus = false;
          this.loading = false;

          this.errorMessage =
            error?.error?.message ||
            'Could not refresh your visit status.';

          this.cdr.detectChanges();
        }
      });
  }

  openChat(): void {
    this.router.navigate([
      '/visitor-chat'
    ]);
  }

  trackAnother(): void {
    this.router.navigate([
      '/visitor-lookup'
    ]);
  }

  get isCheckedOut(): boolean {
    return (
      this.status ===
      'CHECKED_OUT'
    );
  }

  formatTime(
    value?: string
  ): string {
    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }
}