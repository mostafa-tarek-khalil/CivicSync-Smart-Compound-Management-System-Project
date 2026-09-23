
import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisitorFlow } from '../../services/visitor-flow';
import { VisitService } from '../../../../Services/visit-service';

type OtpStatus =
  | 'default'
  | 'submitting'
  | 'processing'
  | 'success'
  | 'error';

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
export class OtpVerification {

  // =========================
  // EMAIL
  // =========================

  // Get the visitor email from VisitorFlow
  email = '';


  // =========================
  // OTP
  // =========================

  otp: string[] = [
    '',
    '',
    '',
    '',
    '',
    ''
  ];


  // =========================
  // STATUS
  // =========================

  status: OtpStatus = 'default';

  isLoading = false;

  errorMessage = '';

  focusedIndex: number | null = null;


  // =========================
  // CONSTRUCTOR
  // =========================

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService
  ) {
    // Get current visitor data
    const visit = this.visitorFlow.getVisit();

    this.email = visit.visitorEmail;
    if (!visit.requestId) this.router.navigate(['/visitor-request']);
  }


  // =========================
  // INPUT FOCUS
  // =========================

  onFocus(index: number): void {

    if (this.isLoading) {
      return;
    }

    this.focusedIndex = index;
  }


  onBlur(index: number): void {

    if (this.focusedIndex === index) {
      this.focusedIndex = null;
    }
  }


  // =========================
  // INPUT
  // =========================

  onInput(
    event: Event,
    index: number
  ): void {

    if (this.isLoading) {
      return;
    }

    const input =
      event.target as HTMLInputElement;

    // Numbers only
    const value =
      input.value.replace(/[^0-9]/g, '');

    input.value = value;

    this.otp[index] = value;


    // Move automatically to next input
    if (value && index < 5) {

      const inputs =
        document.querySelectorAll<HTMLInputElement>(
          '.otp-input'
        );

      inputs[index + 1]?.focus();
    }
  }


  // =========================
  // BACKSPACE
  // =========================

  onKeyDown(
    event: KeyboardEvent,
    index: number
  ): void {

    if (this.isLoading) {
      return;
    }

    if (event.key !== 'Backspace') {
      return;
    }

    const input =
      event.target as HTMLInputElement;


    // Current input has value
    if (input.value) {

      this.otp[index] = '';

      return;
    }


    // Current input is empty
    // Move to previous input
    if (index > 0) {

      event.preventDefault();

      this.otp[index - 1] = '';

      const inputs =
        document.querySelectorAll<HTMLInputElement>(
          '.otp-input'
        );

      inputs[index - 1]?.focus();
    }
  }


  // =========================
  // BUTTON
  // =========================

  handleButtonClick(): void {

    // After successful verification
    if (this.status === 'success') {

      this.router.navigate([
        '/visitor-request-status'
      ]);

      return;
    }


    // Otherwise verify OTP
    this.verifyOtp();
  }


  // =========================
  // VERIFY OTP
  // =========================

  verifyOtp(): void {
    if (this.isLoading) {
      return;
    }

    const enteredCode =
      this.otp.join('');

    if (enteredCode.length !== 6) {
      this.errorMessage = 'Enter the 6-digit code sent to your email.';
      return;
    }

    const visit = this.visitorFlow.getVisit();
    if (!visit.requestId) {
      this.errorMessage = 'Your visitor request could not be found. Please submit it again.';
      return;
    }
    this.isLoading = true;
    this.status = 'submitting';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.visitService.verifyVisitorOtp(visit.requestId, enteredCode).subscribe({
      next: () => {
        this.status = 'success';
        this.isLoading = false;
        this.visitorFlow.updateVisit({ visitStatus: 'Pending Approval', requestStatus: 'Pending' });
        this.cdr.detectChanges();
      },
      error: error => {
        this.status = 'error';
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'The code could not be verified. Check it and try again.';
        this.cdr.detectChanges();
      }
    });
  }


  // =========================
  // RESET OTP
  // =========================

  resetOtp(): void {

    this.isLoading = false;

    this.status = 'default';

    this.focusedIndex = null;


    this.otp = [
      '',
      '',
      '',
      '',
      '',
      ''
    ];


    this.cdr.detectChanges();


    // Focus first input
    setTimeout(() => {

      const inputs =
        document.querySelectorAll<HTMLInputElement>(
          '.otp-input'
        );

      inputs[0]?.focus();

    });
  }


  // =========================
  // RESEND OTP
  // =========================

  resendOtp(): void {

    if (this.isLoading) {
      return;
    }


    const visitId = this.visitorFlow.getVisit().requestId;
    if (!visitId) {
      this.errorMessage = 'Your visitor request could not be found. Please submit it again.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.visitService.sendVisitorOtp(visitId).subscribe({
      next: () => this.resetOtp(),
      error: error => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Could not resend the verification code.';
        this.cdr.detectChanges();
      }
    });
  }

}
