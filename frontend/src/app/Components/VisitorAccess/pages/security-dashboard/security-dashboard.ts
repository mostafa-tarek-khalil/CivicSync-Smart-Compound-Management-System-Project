import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VisitService, VisitRecord } from '../../../../Services/visit-service';
import {
  toSecurityStatus,
  SecurityViewStatus,
  formatDate,
  formatTime,
  residentLabel
} from '../../services/visit-status.util';

interface ActivityItem {
  id: string;
  visitor: string;
  resident: string;
  time: string;
  status: string;
  icon: string;
  statusClass: string;
}

@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './security-dashboard.html',
  styleUrl: './security-dashboard.css'
})
export class SecurityDashboard implements OnInit {

  stats = [
    { title: 'Today’s Visitors', value: 0, icon: 'groups' },
    { title: 'Pending Visits', value: 0, icon: 'pending_actions' },
    { title: 'Checked In', value: 0, icon: 'login' },
    { title: 'Checked Out', value: 0, icon: 'logout' }
  ];

  recentActivity: ActivityItem[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';
    this.visitService.getSecurityVisits().subscribe({
      next: response => {
        const visits = response.data;
        this.buildStats(visits);
        this.recentActivity = visits.slice(0, 6).map(visit => this.toActivity(visit));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Could not load the dashboard.';
        this.cdr.detectChanges();
      }
    });
  }

  private buildStats(visits: VisitRecord[]): void {
    const today = new Date().toDateString();
    const todayVisits = visits.filter(visit => new Date(visit.visitDate).toDateString() === today);
    const pool = todayVisits.length > 0 ? todayVisits : visits;

    this.stats = [
      { title: 'Today’s Visitors', value: pool.length, icon: 'groups' },
      { title: 'Pending Visits', value: pool.filter(v => toSecurityStatus(v.status) === 'Pending').length, icon: 'pending_actions' },
      { title: 'Checked In', value: pool.filter(v => toSecurityStatus(v.status) === 'Checked In').length, icon: 'login' },
      { title: 'Checked Out', value: pool.filter(v => toSecurityStatus(v.status) === 'Checked Out').length, icon: 'logout' }
    ];
  }

  private toActivity(visit: VisitRecord): ActivityItem {
    const status: SecurityViewStatus = toSecurityStatus(visit.status);
    const meta = this.activityMeta(status);

    return {
      id: visit._id,
      visitor: visit.visitorName,
      resident: residentLabel(visit),
      time: visit.checkedOutAt
        ? formatTime(visit.checkedOutAt)
        : visit.checkedInAt
        ? formatTime(visit.checkedInAt)
        : visit.visitStartTime,
      status,
      icon: meta.icon,
      statusClass: meta.statusClass
    };
  }

  private activityMeta(status: SecurityViewStatus): { icon: string; statusClass: string } {
    switch (status) {
      case 'Checked In':
        return { icon: 'login', statusClass: 'checked-in' };
      case 'Checked Out':
        return { icon: 'logout', statusClass: 'checked-out' };
      case 'Approved':
        return { icon: 'verified', statusClass: 'approved' };
      case 'Expired':
      case 'Rejected':
        return { icon: 'block', statusClass: 'expired' };
      case 'Pending':
      default:
        return { icon: 'schedule', statusClass: 'pending' };
    }
  }

  openScanner(): void {
    this.router.navigate(['/qr-scanner']);
  }

  openTodayVisitors(): void {
    this.router.navigate(['/security-visits']);
  }

  openAccessHistory(): void {
    this.router.navigate(['/access-history']);
  }

  openMessages(): void {
    this.router.navigate(['/chat']);
  }

  openVisitorDetails(activity: ActivityItem): void {
    if (!activity?.id) {
      this.router.navigate(['/security-visits']);
      return;
    }
    this.router.navigate(['/visitor-details'], {
      queryParams: { visitId: activity.id }
    });
  }
}