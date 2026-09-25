import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';

/**
 * "Forgot password" step 1: the user submits their e-mail and the backend
 * mails a reset token (never returned in the response body).
 */
@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password-page.html',
  styleUrl: '../login-page/login-page.css'
})
export class ForgotPasswordPage {
  email = '';
  loading = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService) { }

  submit(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    this.loading = true;

    this.authService
      .forgotPassword(this.email.trim())
      .pipe(timeout(9000))
      .subscribe({
        next: response => {
          this.loading = false;
          this.submitted = true;
          this.successMessage =
            response?.message ||
            'If an account exists for that email, a reset link has been sent.';
        },
        error: error => {
          this.loading = false;
          this.errorMessage =
            error?.error?.message ||
            'We could not start the password reset. Please try again.';
        }
      });
  }
}