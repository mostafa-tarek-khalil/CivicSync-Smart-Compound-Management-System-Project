import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ChatSocket } from '../../services/chat-socket';
import { Topbar } from '../../../Components/VisitorAccess/layout/topbar/topbar';
import { NavItem, visibleNavItems } from './nav-items';
import { ROLE_LABEL, UserRole } from '../../models/status';

@Component({
  selector: 'app-authenticated-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    Topbar
  ],
  templateUrl: './authenticated-layout.html',
  styleUrl: './authenticated-layout.css'
})
export class AuthenticatedLayoutComponent {
  /** Desktop rail state (icon-only vs full labels). */
  readonly collapsed = signal(false);

  /** Mobile slide-over drawer state. */
  readonly mobileOpen = signal(false);

  constructor(
    public themeService: ThemeService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private chatSocket: ChatSocket,
    private router: Router
  ) {}

  /**
   * Sidebar entries for the signed-in role.
   *
   * Read from the shared `nav-items` map rather than a local array: a hard-coded
   * list here would show every role the same links and drop the whole
   * resident/technician/security/admin navigation.
   */
  get navItems(): NavItem[] {
    return visibleNavItems(this.authService.userRole);
  }

  /** Human-readable role for the sidebar footer, e.g. `Resident`. */
  get roleLabel(): string {
    const role = this.authService.userRole;
    return role ? ROLE_LABEL[role as UserRole] ?? role : '';
  }

  /** Unread badge, fed by the shared notification signal. */
  get unreadNotifications(): number {
    return this.notificationService.unreadCount();
  }

  /**
   * The single nav toggle, shared by both breakpoints.
   *
   * On wide screens it collapses the rail (the brand mark is the button).
   * Below the mobile breakpoint it opens the slide-over drawer — driven by the
   * topbar hamburger, so a touch user always has a visible affordance.
   */
  toggleNavigation(): void {
    if (this.isMobile()) {
      this.mobileOpen.update(value => !value);
      return;
    }

    this.collapsed.update(value => !value);
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 992;
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    // Drop the realtime connection before clearing credentials, otherwise the
    // socket stays bound to a user that no longer has a token.
    this.chatSocket.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}