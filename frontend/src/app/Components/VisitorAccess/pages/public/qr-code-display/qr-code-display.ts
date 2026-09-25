import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService } from '../../../../../Services/visit-service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code-display',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './qr-code-display.html',
  styleUrl: './qr-code-display.css'
})
export class QrCodeDisplay implements OnInit, OnDestroy {

  visitorName = '';
  visitorEmail = '';
  residentName = '';
  building = '';
  unit = '';
  visitDate = '';
  startTime = '';
  purpose = '';
  requestId = '';
  status = '';
  expiresAt = '';
  qrImage = '';
  qrToken = '';
  loading = false;
  errorMessage = '';

  /**
   * Set when the pass exists but the 1-hour window has not opened yet. The
   * scheduled time and the moment the QR unlocks are both shown to the user.
   */
  notYetAvailable = false;
  availableFrom = '';

  /**
   * While the pass is on screen the visitor is (usually) standing at the gate,
   * so we poll the live status: once security checks them in we forward them to
   * the post-check-in page where they can message their host.
   */
  private statusPoll?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {
    const visit = this.visitorFlow.getVisit();

    // A resident may open this page for a specific request via query params
    // (visitId + email), which takes precedence over the visitor's own flow.
    const paramVisitId = this.route.snapshot.queryParamMap.get('visitId');
    const paramEmail = this.route.snapshot.queryParamMap.get('email');

    this.requestId = paramVisitId || visit.requestId;
    this.visitorEmail = paramEmail || visit.visitorEmail;

    this.visitorName = visit.visitorName;
    this.residentName = visit.residentName;
    this.building = visit.building;
    this.unit = visit.unit;
    this.visitDate = visit.visitDate;
    this.startTime = visit.startTime;
    this.purpose = visit.purpose;
    this.status = visit.status;
    this.expiresAt = this.formatExpiry(visit.qrExpiresAt);
  }

  ngOnInit(): void {
    this.loadVisitorQr();
    this.watchForCheckIn();
  }

  ngOnDestroy(): void {
    if (this.statusPoll) {
      clearInterval(this.statusPoll);
    }
  }

  /** Redirect the visitor as soon as their QR has actually checked them in. */
  private watchForCheckIn(): void {
    this.statusPoll = setInterval(() => {
      if (!this.requestId || !this.visitorEmail) {
        return;
      }

      this.visitService.getVisitorStatus(this.requestId, this.visitorEmail).subscribe({
        next: response => {
          if (response?.data?.status === 'CHECKED_IN') {
            this.visitorFlow.updateVisit({
              status: 'CHECKED_IN',
              checkInTime: response.data.checkedInAt || '',
              visitorChatToken:
                response.data.visitorChatToken || this.visitorFlow.getVisit().visitorChatToken
            });

            if (this.statusPoll) {
              clearInterval(this.statusPoll);
            }

            this.router.navigate(['/visit-in-progress']);
          }
        },
        error: () => {
          // A transient poll error is not worth surfacing on the pass screen.
        }
      });
    }, 8000);
  }

  private loadVisitorQr(): void {
    if (!this.requestId || !this.visitorEmail) {
      this.errorMessage =
        'Visitor request information is missing.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.qrImage = '';
    this.qrToken = '';
    this.notYetAvailable = false;

    this.visitService
      .getVisitorQr(
        this.requestId,
        this.visitorEmail
      )
      .subscribe({
        next: response => {
          if (
            !response ||
            !response.success ||
            !response.data ||
            !response.data.qrToken
          ) {
            this.loading = false;
            this.errorMessage =
              'The visitor QR pass is not available.';
            this.cdr.markForCheck();
            return;
          }

          this.qrToken = response.data.qrToken;
          this.expiresAt = this.formatExpiry(response.data.expiresAt);
          this.status = 'QR_GENERATED';

          // Only the visitor's own session store is updated; a resident opening
          // it for a request does not need to mutate their tracked visit.
          this.visitorFlow.updateVisit({
            status: 'QR_GENERATED',
            qrExpiresAt: response.data.expiresAt
          });

          QRCode.toDataURL(this.qrToken, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 320
          })
            .then(image => {
              this.qrImage = image;
              this.loading = false;
              this.cdr.markForCheck();
            })
            .catch(() => {
              this.errorMessage =
                'Could not render the visitor pass.';
              this.loading = false;
              this.cdr.markForCheck();
            });
        },

        error: error => {
          const message =
            error?.error?.message ||
            error?.error?.error ||
            'The visitor QR pass is not available.';

          // The backend rejects an early request with the 1-hour rule message.
          // Show it as a scheduled notice rather than a hard error.
          if (/1 hour prior/i.test(message)) {
            this.notYetAvailable = true;
            this.availableFrom =
              this.formatExpiry(error?.error?.availableFrom) ||
              this.notBeforeLabel;
          } else {
            this.errorMessage = message;
          }

          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * "1 hour before the scheduled visit", expressed on the visit's own date.
   *
   * Used as a fallback label when the server did not send an exact timestamp,
   * so the visitor always sees *when* to come back.
   */
  get notBeforeLabel(): string {
    if (!this.visitDate) {
      return '1 hour before your visit time';
    }

    const day = this.formatDisplayDate(this.visitDate);

    return this.startTime
      ? `1 hour before ${this.startTime} on ${day}`
      : `1 hour before your visit on ${day}`;
  }

  private formatDisplayDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /** Human-friendly expiry, e.g. "Sep 24, 2026 · 05:30 PM". */
  private formatExpiry(value?: string | null): string {
    if (!value) {
      return 'Not available';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const day = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${day} · ${time}`;
  }

  viewVisitStatus(): void {
    this.router.navigate([
      '/visitor-request-status'
    ]);
  }

  goBack(): void {
    // Prefer real history so a resident who opened this from their visitor
    // list returns there, not to the visitor-only status page.
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/visitor-request-status']);
  }

  get initials(): string {
    return (this.visitorName || 'Visitor')
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}