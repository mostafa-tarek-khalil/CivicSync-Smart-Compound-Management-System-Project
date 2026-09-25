import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage {

  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';
  infoMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    if (
      this.route.snapshot.queryParamMap.get('registered') ===
      'pending'
    ) {
      this.infoMessage =
        'Your account was created and is now pending admin approval. You will be able to sign in once it is approved.';
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';
    this.infoMessage = '';

    if (!this.email.trim() || !this.password) {
      this.errorMessage =
        'Please enter your email and password.';
      return;
    }

    this.loading = true;
    // Paint the spinner before the request starts.
    this.cdr.markForCheck();

    this.authService
      .login(
        this.email.trim(),
        this.password
      )
      .pipe(
        timeout(9000),
        // `finalize` is the single place the spinner is cleared, so a success,
        // an HTTP error and a timeout all release the button immediately even
        // though this app runs zoneless and never patches the callback queue.
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          const user = response.data?.user;

          if (!user) {
            this.errorMessage =
              'Login succeeded, but user data was not returned.';
            return;
          }

          switch (user.role) {
            case 'RESIDENT':
              this.router.navigate([
                '/resident/dashboard'
              ]);
              break;

            case 'TECHNICIAN':
              this.router.navigate([
                '/technician/dashboard'
              ]);
              break;

            case 'SECURITY':
              this.router.navigate([
                '/security-dashboard'
              ]);
              break;

            case 'ADMIN':
              this.router.navigate([
                '/admin/dashboard'
              ]);
              break;

            default:
              this.errorMessage =
                'Your account role is not supported.';
          }

          this.cdr.markForCheck();
        },

        error: (error) => {
          if (error?.name === 'TimeoutError') {
            this.errorMessage =
              'The login request is taking too long. Please try again.';
            this.cdr.markForCheck();
            return;
          }

          if (error?.status === 0) {
            this.errorMessage =
              'Unable to connect to CivicSync. Please make sure the server is running.';
            this.cdr.markForCheck();
            return;
          }

          this.errorMessage =
            error?.error?.message ||
            'Invalid email or password.';

          this.cdr.markForCheck();
        }
      });
  }
}
