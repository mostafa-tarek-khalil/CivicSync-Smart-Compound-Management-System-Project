import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

/**
 * Shown by the RoleGuard when a signed-in user reaches a page their role may
 * not open. Explains the situation and offers a safe way back — it never
 * silently swaps the requested page for an unrelated dashboard.
 */
@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessDeniedComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);

  get roleLabel(): string {
    return this.authService.userRole ?? 'Unknown';
  }

  goHome(): void {
    this.router.navigate([this.authService.homeRoute]);
  }

  goBack(): void {
    this.location.back();
  }
}
