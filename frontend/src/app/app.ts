import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Topbar } from './Components/VisitorAccess/layout/topbar/topbar';
import { AuthService } from './Services/auth-service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Topbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ecommerce');

  constructor(public authService: AuthService) {}

  get showTopbar(): boolean {
    const publicPaths = [
      '/', '', '/login', '/register', '/register/role', '/register/details',
      '/visitor-entry', '/visitor-lookup',
      '/visitor-request', '/otp-verification', '/visitor-request-status',
      '/qr-code-display', '/visit-status'
    ];
    return this.authService.isLoggedIn() && !publicPaths.includes(location.pathname);
  }
}
