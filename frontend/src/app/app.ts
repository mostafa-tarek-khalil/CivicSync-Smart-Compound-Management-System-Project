import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { NotificationToastComponent } from './Components/shared/notification-toast/notification-toast';
import { DialogComponent } from './shared/components/dialog/dialog';

import { AuthService } from './core/services/auth.service';

/**
 * Application root.
 *
 * The chrome (topbar + sidebar) now belongs to AuthenticatedLayoutComponent,
 * so the root only hosts the router outlet plus the global toast and dialog
 * stacks.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NotificationToastComponent,
    DialogComponent
  ],
  templateUrl: './app.html'
})
export class App {

  constructor(public authService: AuthService) {}
}