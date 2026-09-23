import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TechnicianSidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-technician-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    TechnicianSidebarComponent
  ],
  templateUrl: './tech-layout.html',
  styleUrl: './tech-layout.css'
})
export class TechnicianLayoutComponent {

  sidebarOpen = false;

  openSidebar(): void {
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}