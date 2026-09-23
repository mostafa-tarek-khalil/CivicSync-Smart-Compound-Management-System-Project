import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisitService, VisitRecord } from '../../../../Services/visit-service';
import {
  toSecurityStatus,
  SecurityViewStatus,
  splitStartTime,
  formatDate,
  buildingLabel,
  unitLabel,
  residentLabel
} from '../../services/visit-status.util';

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

  todayLabel = formatDate(new Date().toISOString());

  visitors: SecurityVisitor[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadVisits();
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
      status: toSecurityStatus(visit.status)
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

      return matchesStatus && matchesSearch;
    });
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
      ['/visitor-details'],
      {
        queryParams: {
          visitId: visitor.id
        }
      }
    );
  }

  goBack(): void {
    this.router.navigate(['/security-dashboard']);
  }
}