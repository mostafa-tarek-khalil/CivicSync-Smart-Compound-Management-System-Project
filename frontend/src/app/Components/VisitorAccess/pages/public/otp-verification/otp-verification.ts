import { Component, ChangeDetectorRef, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService } from '../../../../../Services/visit-service';

type OtpStatus =
  | 'default'
  | 'submitting'
  | 'processing'
  | 'success'
  | 'error';

const MIN_PROCESSING_MS = 800;
const ERROR_DISPLAY_MS = 1200;
const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './otp-verification.html',
  styleUrl: './otp-verification.css'
})
export class OtpVerification implements OnDestroy {
  email = '';

  otp: string[] = [
    '',
    '',
    '',
    '',
    '',
    ''
  ];

  status: OtpStatus = 'default';
  isLoading = false;
  errorMessage = '';
  focusedIndex: number | null = null;

  readonly attemptsUsed = signal(0);
  readonly secondsRemaining = signal(0);
  readonly resendCooldown = signal(0);

  private countdownTimer?: ReturnType<typeof setInterval>;
  private resendTimer?: ReturnType<typeof setInterval>;
  private resultTimer?: ReturnType<typeof setTimeout>;
  private errorResetTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService
  ) {
    const visit = this.visitorFlow.getVisit();

    this.email = visit.visitorEmail;

    if (!visit.requestId) {
      this.router.navigate(['/visitor-request']);
      return;
    }

    this.startExpiryCountdown(OTP_TTL_MS);
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }

    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = undefined;
    }

    if (this.resultTimer) {
      clearTimeout(this.resultTimer);
      this.resultTimer = undefined;
    }

    if (this.errorResetTimer) {
      clearTimeout(this.errorResetTimer);
      this.errorResetTimer = undefined;
    }
  }

  private startExpiryCountdown(source: number | string): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    const expiresAt =
      typeof source === 'string'
        ? new Date(source).getTime()
        : Date.now() + source;

    const tick = () => {
      const left = Math.max(
        0,
        Math.round((expiresAt - Date.now()) / 1000)
      );

      this.secondsRemaining.set(left);

      if (left === 0 && this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = undefined;
      }
    };

    tick();

    this.countdownTimer = setInterval(tick, 1000);
  }

  get expiryLabel(): string {
    const remaining = this.secondsRemaining();

    if (remaining <= 0) {
      return '';
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  get isExpired(): boolean {
    return this.secondsRemaining() <= 0 && this.status !== 'success';
  }

  get attemptsLeft(): number {
    return Math.max(
      0,
      MAX_OTP_ATTEMPTS - this.attemptsUsed()
    );
  }

  get showAttemptsWarning(): boolean {
    return this.attemptsUsed() > 0 && this.attemptsLeft <= 2;
  }

  onFocus(index: number): void {
    if (this.isLoading) {
      return;
    }

    if (this.status === 'error') {
      this.resetOtp();
      return;
    }

    this.focusedIndex = index;
  }

  onBlur(index: number): void {
    if (this.focusedIndex === index) {
      this.focusedIndex = null;
    }
  }

  onInput(
    event: Event,
    index: number
  ): void {
    if (this.isLoading) {
      return;
    }

    const input =
      event.target as HTMLInputElement;

    const digits =
      input.value.replace(/[^0-9]/g, '');

    if (digits.length > 1) {
      input.value = '';
      this.distribute(digits, index);
      return;
    }

    input.value = digits;

    this.otp[index] = digits;

    if (digits && index < 5) {
      const inputs =
        document.querySelectorAll<HTMLInputElement>(
          '.otp-input'
        );

      inputs[index + 1]?.focus();
    }

    this.cdr.markForCheck();
  }

  private distribute(
    digits: string,
    startIndex: number
  ): void {
    const inputs =
      document.querySelectorAll<HTMLInputElement>(
        '.otp-input'
      );

    let cursor = startIndex;

    for (const digit of digits.split('')) {
      if (cursor > 5) {
        break;
      }

      this.otp[cursor] = digit;

      if (inputs[cursor]) {
        inputs[cursor].value = digit;
      }

      cursor += 1;
    }

    const nextEmpty =
      this.otp.findIndex(
        (value, i) =>
          i >= startIndex && !value
      );

    (
      inputs[nextEmpty === -1 ? 5 : nextEmpty]
    )?.focus();

    this.cdr.markForCheck();
  }

  onPaste(
    event: ClipboardEvent,
    index: number
  ): void {
    if (this.isLoading) {
      return;
    }

    const pasted =
      event.clipboardData?.getData('text') || '';

    const digits =
      pasted.replace(/[^0-9]/g, '');

    if (!digits) {
      return;
    }

    event.preventDefault();

    this.distribute(digits, index);
  }

  onArrow(
    event: KeyboardEvent,
    index: number
  ): void {
    if (this.isLoading) {
      return;
    }

    const inputs =
      document.querySelectorAll<HTMLInputElement>(
        '.otp-input'
      );

    if (
      event.key === 'ArrowLeft' &&
      index > 0
    ) {
      event.preventDefault();

      inputs[index - 1]?.focus();
    }

    if (
      event.key === 'ArrowRight' &&
      index < 5
    ) {
      event.preventDefault();

      inputs[index + 1]?.focus();
    }
  }

  onKeyDown(
    event: KeyboardEvent,
    index: number
  ): void {
    if (this.isLoading) {
      return;
    }

    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight'
    ) {
      this.onArrow(event, index);
      return;
    }

    if (event.key !== 'Backspace') {
      return;
    }

    const input =
      event.target as HTMLInputElement;

    if (input.value) {
      this.otp[index] = '';

      this.cdr.markForCheck();

      return;
    }

    if (index > 0) {
      event.preventDefault();

      this.otp[index - 1] = '';

      const inputs =
        document.querySelectorAll<HTMLInputElement>(
          '.otp-input'
        );

      inputs[index - 1]?.focus();

      this.cdr.markForCheck();
    }
  }

  handleButtonClick(): void {
    if (this.status === 'success') {
      this.router.navigate([
        '/visitor-request-status'
      ]);

      return;
    }

    this.verifyOtp();
  }

  verifyOtp(): void {
    if (this.isLoading) {
      return;
    }

    const enteredCode =
      this.otp.join('');

    if (enteredCode.length !== 6) {
      this.errorMessage =
        'Enter the 6-digit code sent to your email.';

      this.cdr.markForCheck();

      return;
    }

    if (this.isExpired) {
      this.errorMessage =
        'This code has expired. Request a new one.';

      this.cdr.markForCheck();

      return;
    }

    const visit =
      this.visitorFlow.getVisit();

    if (!visit.requestId) {
      this.errorMessage =
        'Your visitor request could not be found. Please submit it again.';

      this.cdr.markForCheck();

      return;
    }

    this.isLoading = true;
    this.status = 'submitting';
    this.errorMessage = '';

    this.resultTimer = setTimeout(() => {
      if (this.status === 'submitting') {
        this.status = 'processing';

        this.cdr.markForCheck();
      }
    }, MIN_PROCESSING_MS);

    const startedAt = Date.now();

    this.visitService
      .verifyVisitorOtp(
        visit.requestId,
        enteredCode
      )
      .subscribe({
        next: () => {
          this.revealResult(
            'success',
            startedAt
          );
        },

        error: error => {
          this.attemptsUsed.update(
            n => n + 1
          );

          this.otp = [
            '',
            '',
            '',
            '',
            '',
            ''
          ];

          this.focusedIndex = null;

          this.revealResult(
            'error',
            startedAt,
            error?.error?.message ||
              'The code could not be verified. Check it and try again.'
          );
        }
      });
  }

  private revealResult(
    outcome: 'success' | 'error',
    startedAt: number,
    message = ''
  ): void {
    const elapsed =
      Date.now() - startedAt;

    const wait = Math.max(
      0,
      MIN_PROCESSING_MS - elapsed
    );

    if (this.resultTimer) {
      clearTimeout(
        this.resultTimer
      );

      this.resultTimer = undefined;
    }

    setTimeout(() => {
      if (outcome === 'success') {
        this.status = 'success';
        this.errorMessage = '';
        this.isLoading = false;

        this.visitorFlow.updateVisit({
          status: 'PENDING'
        });

        this.cdr.markForCheck();

        return;
      }

      this.status = 'error';
      this.errorMessage = message;
      this.isLoading = true;

      this.otp = [
        '',
        '',
        '',
        '',
        '',
        ''
      ];

      this.focusedIndex = null;

      this.cdr.markForCheck();

      this.errorResetTimer = setTimeout(() => {
        this.resetOtp();
      }, ERROR_DISPLAY_MS);
    }, wait);
  }

  resetOtp(): void {
    if (this.errorResetTimer) {
      clearTimeout(
        this.errorResetTimer
      );

      this.errorResetTimer = undefined;
    }

    this.isLoading = false;

    this.status = 'default';

    this.errorMessage = '';

    this.focusedIndex = null;

    this.otp = [
      '',
      '',
      '',
      '',
      '',
      ''
    ];

    this.cdr.markForCheck();

    this.refocusFirstInput();
  }

  private refocusFirstInput(): void {
    setTimeout(() => {
      const inputs =
        document.querySelectorAll<HTMLInputElement>(
          '.otp-input'
        );

      inputs[0]?.focus();
    });
  }

  resendOtp(): void {
    if (this.isLoading) {
      return;
    }

    if (
      this.resendCooldown() > 0 &&
      !this.isExpired
    ) {
      return;
    }

    const visitId =
      this.visitorFlow.getVisit().requestId;

    if (!visitId) {
      this.errorMessage =
        'Your visitor request could not be found. Please submit it again.';

      this.cdr.markForCheck();

      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.status = 'default';

    this.visitService
      .sendVisitorOtp(visitId)
      .subscribe({
        next: response => {
          const expiresAt =
            response?.data?.expiresAt;

          this.resetOtp();

          if (expiresAt) {
            this.startExpiryCountdown(
              expiresAt
            );
          } else {
            this.startExpiryCountdown(
              OTP_TTL_MS
            );
          }

          this.startResendCooldown();

          this.cdr.markForCheck();
        },

        error: error => {
          this.isLoading = false;

          this.errorMessage =
            error?.error?.message ||
            'Could not resend the verification code.';

          this.cdr.markForCheck();
        }
      });
  }

  private startResendCooldown(
    seconds = 30
  ): void {
    if (this.resendTimer) {
      clearInterval(
        this.resendTimer
      );
    }

    this.resendCooldown.set(seconds);

    this.resendTimer = setInterval(() => {
      this.resendCooldown.update(
        n => Math.max(0, n - 1)
      );

      if (
        this.resendCooldown() === 0 &&
        this.resendTimer
      ) {
        clearInterval(
          this.resendTimer
        );

        this.resendTimer = undefined;
      }
    }, 1000);
  }
}