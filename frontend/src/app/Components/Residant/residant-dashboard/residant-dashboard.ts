import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { NavbarComponent } from '../navbar/navbar';

@Component({
  selector: 'app-resident-dashboard',
  standalone: true,

  imports: [
    CommonModule,
    NavbarComponent
  ],
templateUrl: './residant-dashboard.html',
  styleUrl: './residant-dashboard.css'

})
export class ResidentDashboardComponent implements OnInit {

  userName = 'Ahmed';

  dashboard = {
    visitorsCount: 0,

    maintenanceCount: 0,
    completedCount: 0,

    outstandingBalance: 0,

    openTickets: 0,
    assignedTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,

    latestInvoice: null as any,

    recentTickets: [] as any[],

    recentVisitors: [] as any[]
  };

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    // هنربط الـ Dashboard Service هنا بعد ما نعمل الـ backend routes.
  }

  goToMaintenance(): void {
    this.router.navigate([
      '/resident/maintenance-view'
    ]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'OPEN':
        return 'status-open';

      case 'ASSIGNED':
        return 'status-assigned';

      case 'IN_PROGRESS':
        return 'status-progress';

      case 'RESOLVED':
        return 'status-resolved';

      case 'CLOSED':
        return 'status-closed';

      default:
        return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'LOW':
        return 'priority-low';

      case 'MEDIUM':
        return 'priority-medium';

      case 'HIGH':
        return 'priority-high';

      case 'URGENT':
        return 'priority-urgent';

      default:
        return '';
    }
  }
}