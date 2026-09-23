import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { AuthService } from '../../Services/auth-service';

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

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';

    if (!this.email.trim() || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.loading = true;

    this.authService
      .login(
        this.email.trim(),
        this.password
      )
      .pipe(
        timeout(9000)
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          const user = response.data?.user;

          if (!user) {
            this.errorMessage = 'Login succeeded, but user data was not returned.';
            return;
          }

          switch (user.role) {
            case 'RESIDENT':
              this.router.navigate(['/chat']);
              break;
            case 'TECHNICIAN':
              // Dedicated technician dashboard is not built yet — land on chat,
              // which every role can use, instead of a dead route.
              this.router.navigate(['/chat']);
              break;
            case 'SECURITY':
              this.router.navigate(['/security-dashboard']);
              break;
            case 'ADMIN':
              // Dedicated admin dashboard is not built yet — land on chat.
              this.router.navigate(['/chat']);
              break;
            default:
              this.errorMessage = 'Your account role is not supported.';
          }
        },
        error: (error) => {
          this.loading = false;

          if (error?.name === 'TimeoutError') {
            this.errorMessage = 'The login request is taking too long. Please try again.';
            return;
          }

          if (error?.status === 0) {
            this.errorMessage = 'Unable to connect to CivicSync. Please make sure the server is running.';
            return;
          }

          this.errorMessage = error?.error?.message || 'Invalid email or password.';
        }
      });
  }
}
