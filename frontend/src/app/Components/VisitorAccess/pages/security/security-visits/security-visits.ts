import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VisitService, VisitRecord } from '../../../../../Services/visit-service';
import {
  toSecurityStatus,
  SecurityViewStatus,
  splitStartTime,
  formatDate,
  buildingLabel,
  unitLabel,
  residentLabel,
  isVisitOnDay
} from '../../../services/visit-status.util';

interface SecurityVisitor {
  id: string;
  name: string;
  resident: string;
  building: string;
  unit: string;
  date: string;
  time: string;
  period: string;
  purpose: string;
  status: SecurityViewStatus;
  /** Raw ISO visit date, used by the Today/date filters. */
  isoDate?: string;
}

@Component({
  selector: 'app-security-visits',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './security-visits.html',
  styleUrl: './security-visits.css'
})
export class SecurityVisits implements OnInit {

  searchTerm = '';
  selectedStatus = 'All';

  /** Default view is today's schedule; the toggle opens the full history. */
  showAll = false;
  filterDate = '';

  todayLabel = formatDate(new Date().toISOString());

  visitors: SecurityVisitor[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // A dashboard stat card links here with ?filter=..., so honour it on load:
    // the operator lands on exactly the rows they clicked.
    const filter = this.route.snapshot.queryParamMap.get('filter');
    this.applyIncomingFilter(filter);

    this.loadVisits();
  }

  /** Map a dashboard card's target onto this page's own filters. */
  private applyIncomingFilter(filter: string | null): void {
    switch (filter) {
      case 'pending':
        this.selectedStatus = 'Pending';
        this.showAll = true;
        break;

      case 'checked-in':
        this.selectedStatus = 'Checked In';
        this.showAll = true;
        break;

      case 'checked-out':
        this.selectedStatus = 'Checked Out';
        this.showAll = true;
        break;

      case 'all':
        this.selectedStatus = 'All';
        break;

      default:
        // No filter param: keep the default "today's schedule" view.
        break;
    }
  }

  loadVisits(): void {
    this.loading = true;
    this.errorMessage = '';
    this.visitService.getSecurityVisits().subscribe({
      next: response => {
        this.visitors = response.data.map(visit => this.toSecurityVisitor(visit));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.visitors = [];
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Could not load the visitor schedule.';
        this.cdr.detectChanges();
      }
    });
  }

  /** Toggle between "today only" (default) and the full history. */
  toggleShowAll(): void {
    this.showAll = !this.showAll;
    if (!this.showAll) {
      this.filterDate = '';
    }
  }

  private toSecurityVisitor(visit: VisitRecord): SecurityVisitor {
    const { time, period } = splitStartTime(visit.visitStartTime);
    return {
      id: visit._id,
      name: visit.visitorName,
      resident: residentLabel(visit),
      building: buildingLabel(visit),
      unit: unitLabel(visit),
      date: formatDate(visit.visitDate),
      time,
      period,
      purpose: visit.purpose || 'Visit',
      status: toSecurityStatus(visit.status),
      // Keep the raw date so the Today/All + date filters can compare exactly.
      isoDate: visit.visitDate
    };
  }

  get filteredVisitors(): SecurityVisitor[] {

    const search = this.searchTerm
      .toLowerCase()
      .trim();

    return this.visitors.filter(visitor => {

      const matchesStatus =
        this.selectedStatus === 'All' ||
        visitor.status === this.selectedStatus;

      const matchesSearch =
        !search ||
        visitor.name.toLowerCase().includes(search) ||
        visitor.resident.toLowerCase().includes(search) ||
        visitor.unit.toLowerCase().includes(search) ||
        visitor.building.toLowerCase().includes(search);

      const matchesDate = this.matchesDateFilter(visitor);

      return matchesStatus && matchesSearch && matchesDate;
    });
  }

  /** Today-only by default; a specific day when the operator picks one; all days when toggled. */
  private matchesDateFilter(visitor: SecurityVisitor): boolean {
    if (this.filterDate) {
      return visitor.isoDate
        ? isVisitOnDay({ visitDate: visitor.isoDate } as VisitRecord, new Date(this.filterDate))
        : false;
    }

    if (this.showAll) {
      return true;
    }

    return visitor.isoDate
      ? isVisitOnDay({ visitDate: visitor.isoDate } as VisitRecord)
      : false;
  }

  get pendingCount(): number {
    return this.visitors.filter(
      visitor => visitor.status === 'Pending'
    ).length;
  }

  get checkedInCount(): number {
    return this.visitors.filter(
      visitor => visitor.status === 'Checked In'
    ).length;
  }

  get approvedCount(): number {
    return this.visitors.filter(
      visitor => visitor.status === 'Approved'
    ).length;
  }

  getInitials(name: string): string {

    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  viewDetails(visitor: SecurityVisitor): void {

    this.router.navigate(
      ['/security/visitors/details'],
      {
        queryParams: {
          visitId: visitor.id
        }
      }
    );
  }

  goBack(): void {
    this.router.navigate(['/security/visitors']);
  }
}