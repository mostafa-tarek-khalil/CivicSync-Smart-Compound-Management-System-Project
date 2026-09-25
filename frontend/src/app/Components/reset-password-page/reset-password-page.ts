import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';

/**
 * "Forgot password" step 2: the user opens the emailed link (`?token=…`) and
 * chooses a new password. On success we send them back to sign in.
 */
@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password-page.html',
  styleUrl: '../login-page/login-page.css'
})
export class ResetPasswordPage implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage =
        'This reset link is missing its token. Please request a new one.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Your new password must be at least 6 characters.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'The passwords do not match.';
      return;
    }

    this.loading = true;

    this.authService
      .resetPassword(this.token, this.password)
      .pipe(timeout(9000))
      .subscribe({
        next: response => {
          this.loading = false;
          this.successMessage =
            response?.message || 'Your password has been reset.';
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: error => {
          this.loading = false;
          this.errorMessage =
            error?.error?.message ||
            'This reset link is invalid or has expired.';
        }
      });
  }
}