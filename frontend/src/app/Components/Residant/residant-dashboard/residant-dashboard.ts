import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { NavbarComponent } from '../navbar/navbar';
import { AuthService } from '../../../Services/auth-service';
import { MaintenanceTicketService } from '../../../Services/maintenance-ticket';
import {
  IMaintenanceTicket,
  TTicketStatus
} from '../../../Models/imaintenance-ticket';

export interface ILatestInvoice {
  invoiceNumber: string;
  status: string;
  period: string;
  amount: number;
  issueDate: string;
  dueDate: string;
}

export interface IRecentVisitor {
  _id: string;
  name: string;
  date: string;
  time: string;
  status: string;
}

interface IDashboardData {
  visitorsCount: number;
  maintenanceCount: number;
  completedCount: number;
  outstandingBalance: number;
  openTickets: number;
  assignedTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  latestInvoice: ILatestInvoice | null;
  recentTickets: IMaintenanceTicket[];
  recentVisitors: IRecentVisitor[];
}

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

  userName = '';

  dashboard: IDashboardData = {
    visitorsCount: 0,
    maintenanceCount: 0,
    completedCount: 0,
    outstandingBalance: 0,
    openTickets: 0,
    assignedTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    latestInvoice: null,
    recentTickets: [],
    recentVisitors: []
  };

  isLoading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private ticketService: MaintenanceTicketService
  ) {}

  ngOnInit(): void {
    this.loadUserName();
    this.loadDashboard();
  }

  loadUserName(): void {
    const user = this.authService.getUser();
    this.userName = user?.name || 'Resident';
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.ticketService.getResidentTickets().subscribe({
      next: (res) => {
        const tickets = res.tickets || [];
        this.applyTicketsData(tickets);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.errorMessage =
          err.error?.message || 'Unable to load dashboard data.';
        this.isLoading = false;
      }
    });
  }

  private applyTicketsData(tickets: IMaintenanceTicket[]): void {
    const countByStatus = (status: TTicketStatus): number =>
      tickets.filter((t) => t.status === status).length;

    this.dashboard.maintenanceCount = tickets.length;
    this.dashboard.openTickets = countByStatus('OPEN');
    this.dashboard.assignedTickets = countByStatus('ASSIGNED');
    this.dashboard.inProgressTickets = countByStatus('IN_PROGRESS');
    this.dashboard.resolvedTickets = countByStatus('RESOLVED');
    this.dashboard.closedTickets = countByStatus('CLOSED');
    this.dashboard.completedCount =
      this.dashboard.resolvedTickets + this.dashboard.closedTickets;

    this.dashboard.recentTickets = [...tickets]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, 4);

    // الحقول دي محتاجة Backend Routes مخصصة (Visits / Invoices)
    // وده مرتبط بمهمة منفصلة، فسيبناها زي ما هي لحد ما الـ API يبقى جاهز.
    this.dashboard.visitorsCount = 0;
    this.dashboard.recentVisitors = [];
    this.dashboard.latestInvoice = null;
    this.dashboard.outstandingBalance = 0;
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