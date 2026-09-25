import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MaintenanceTicketService } from '../../../Services/maintenance-ticket';
import { IMaintenanceTicket } from '../../../Models/imaintenance-ticket';
import { ChatSocket } from '../../../core/services/chat-socket';

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './maintaine-view.html',
  styleUrl: './maintaine-view.css'
})
export class MaintenancePageComponent implements OnInit, OnDestroy {
  tickets: IMaintenanceTicket[] = [];
  filteredTickets: IMaintenanceTicket[] = [];

  activeFilter: 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED' = 'ALL';
  searchQuery: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  private readonly liveRefreshTypes = new Set([
    'MAINTENANCE_CREATED',
    'TICKET_ASSIGNED',
    'TICKET_STATUS_CHANGED',
    'NEW_OFFER'
  ]);

  private onNotification = (notification: { type: string }) => {
    if (notification && this.liveRefreshTypes.has(notification.type)) {
      this.loadTickets();
    }
  };

  constructor(
    private ticketService: MaintenanceTicketService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private chatSocket: ChatSocket
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    this.chatSocket.connect();
    this.chatSocket.on('notification:new', this.onNotification);
  }

  ngOnDestroy(): void {
    this.chatSocket.off('notification:new', this.onNotification);
  }

  loadTickets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.ticketService.getResidentTickets().subscribe({
      next: (res) => {
        this.tickets = res.tickets || [];
        this.applyFilter();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching resident tickets:', err);
        this.errorMessage =
          err.error?.message || 'Unable to load your maintenance requests.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  setFilter(filter: 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED'): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredTickets = this.tickets.filter((ticket) => {
      const matchStatus =
        this.activeFilter === 'ALL'
          ? true
          : this.activeFilter === 'IN_PROGRESS'
          ? ticket.status === 'IN_PROGRESS' || ticket.status === 'ASSIGNED'
          : this.activeFilter === 'CLOSED'
          ? ticket.status === 'CLOSED' || ticket.status === 'RESOLVED'
          : ticket.status === this.activeFilter;

      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        ticket.title?.toLowerCase().includes(q) ||
        ticket.description?.toLowerCase().includes(q) ||
        ticket._id?.toLowerCase().includes(q) ||
        ticket.category?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }

  get openCount(): number {
    return this.tickets.filter((t) => t.status === 'OPEN').length;
  }

  get inProgressCount(): number {
    return this.tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
  }

  get closedCount(): number {
    return this.tickets.filter((t) => t.status === 'CLOSED' || t.status === 'RESOLVED').length;
  }

  goToCreate(): void {
    this.router.navigate(['/resident/create-ticket']);
  }

  onViewDetails(ticketId: string): void {
    this.router.navigate(['/resident/maintenance', ticketId]);
  }
}