import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisitService, VisitRecord } from '../../../../../Services/visit-service';
import {
  toSecurityStatus,
  isHistoricalVisit,
  formatDate,
  formatTime,
  residentLabel
} from '../../../services/visit-status.util';

interface AccessRecord {
  visitor: string;
  resident: string;
  date: string;
  checkIn: string;
  checkOut: string;
  securityStaff: string;
  status: string;
}

@Component({
  selector: 'app-access-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './access-history.html',
  styleUrl: './access-history.css'
})
export class AccessHistory implements OnInit {

  searchTerm = '';
  selectedStatus = 'All';

  statuses = [
    'All',
    'Checked In',
    'Checked Out',
    'Expired'
  ];

  records: AccessRecord[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.errorMessage = '';
    this.visitService.getSecurityVisits().subscribe({
      next: response => {
        this.records = response.data
          .filter(visit => isHistoricalVisit(visit))
          .map(visit => this.toAccessRecord(visit));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.records = [];
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Could not load the access history.';
        this.cdr.detectChanges();
      }
    });
  }

  private toAccessRecord(visit: VisitRecord): AccessRecord {
    return {
      visitor: visit.visitorName,
      resident: residentLabel(visit),
      date: formatDate(visit.visitDate),
      checkIn: visit.checkedInAt ? formatTime(visit.checkedInAt) : '-',
      checkOut: visit.checkedOutAt ? formatTime(visit.checkedOutAt) : '-',
      securityStaff: this.staffName(visit.securityId),
      status: toSecurityStatus(visit.status)
    };
  }

  private staffName(securityId: VisitRecord['securityId']): string {
    if (securityId && typeof securityId === 'object') {
      return securityId.name;
    }
    return '-';
  }

  get filteredRecords() {
    const search = this.searchTerm.toLowerCase().trim();

    return this.records.filter(record => {

      const matchesStatus =
        this.selectedStatus === 'All' ||
        record.status === this.selectedStatus;

      const matchesSearch =
        !search ||
        record.visitor.toLowerCase().includes(search) ||
        record.resident.toLowerCase().includes(search) ||
        record.securityStaff.toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }

  goBack(): void {
    this.router.navigate(['/security/visitors']);
  }

  openVisitors(): void {
    this.router.navigate(['/security/visitors/list']);
  }
}