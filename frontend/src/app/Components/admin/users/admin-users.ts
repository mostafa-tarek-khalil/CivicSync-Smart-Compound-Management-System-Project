import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser } from '../../../Services/admin-service';
import { ModalService } from '../../../core/services/modal.service';
import { RealtimeRefresh } from '../../../core/utils/realtime-refresh';
import { ChatSocket } from '../../../core/services/chat-socket';

/**
 * Admin user management: every account, with the approval queue that was
 * previously only reachable from the overview card.
 */
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.html',
  styleUrl: '../shared/admin-shared.css'
})
export class AdminUsers implements OnInit, OnDestroy {

  users: AdminUser[] = [];
  loading = false;
  errorMessage = '';
  actionUserId = '';

  statusFilter = '';
  roleFilter = '';
  search = '';

  // ---------- Edit user modal ----------
  userModalOpen = false;
  savingUser = false;
  editingUserId = '';
  /**
   * Only email + phone are editable here. The display name belongs to the
   * user's own profile page, so it is shown read-only rather than hidden, and
   * it is never sent to the API.
   */
  userForm = { name: '', email: '', phone: '' };

  readonly statuses = ['', 'PENDING', 'ACTIVE', 'REJECTED'];
  readonly roles = ['', 'RESIDENT', 'TECHNICIAN', 'SECURITY', 'ADMIN'];

  private readonly realtime: RealtimeRefresh;

  constructor(
    private adminService: AdminService,
    private modalService: ModalService,
    private chatSocket: ChatSocket,
    private cdr: ChangeDetectorRef
  ) {
    // New sign-ups and approvals elsewhere in the console should land here
    // without the admin having to touch the filter bar.
    this.realtime = new RealtimeRefresh(
      this.chatSocket,
      ['ACCOUNT_APPROVED'],
      () => this.load()
    );
  }

  ngOnInit(): void {
    this.load();
    this.realtime.start();
  }

  ngOnDestroy(): void {
    this.realtime.stop();
  }

  /**
   * Query params as the API expects them.
   *
   * Any value that means "no filter" (blank, or the literal `ALL` some
   * dropdowns carry) is dropped entirely rather than sent — sending
   * `status=ALL` used to match zero rows and blank out the table.
   */
  private get filterParams(): { status?: string; role?: string; search?: string } {
    const params: { status?: string; role?: string; search?: string } = {};

    if (this.isRealFilter(this.statusFilter)) params.status = this.statusFilter;
    if (this.isRealFilter(this.roleFilter)) params.role = this.roleFilter;
    if (this.search?.trim()) params.search = this.search.trim();

    return params;
  }

  private isRealFilter(value: string): boolean {
    const text = (value ?? '').trim();
    return !!text && text.toUpperCase() !== 'ALL';
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService
      .getUsers(this.filterParams)
      .subscribe({
        next: response => {
          this.users = response.data || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          this.loading = false;
          this.errorMessage = error?.error?.message || 'Could not load users.';
          this.cdr.detectChanges();
        }
      });
  }

  applyFilters(): void {
    this.load();
  }

  approve(user: AdminUser): void {
    this.act(user, () => this.adminService.approveUser(user._id));
  }

  reject(user: AdminUser): void {
    this.modalService
      .confirm({
        title: 'Reject registration',
        message: `Reject ${user.name}'s registration?`,
        confirmLabel: 'Reject',
        danger: true
      })
      .then(confirmed => {
        if (!confirmed) return;

        this.act(user, () => this.adminService.rejectUser(user._id));
      });
  }

  private act(user: AdminUser, action: () => ReturnType<AdminService['approveUser']>): void {
    if (this.actionUserId) return;

    this.actionUserId = user._id;
    this.errorMessage = '';

    action().subscribe({
      next: () => {
        this.actionUserId = '';
        this.load();
      },
      error: error => {
        this.actionUserId = '';
        this.errorMessage = error?.error?.message || 'The action could not be completed.';
        this.cdr.detectChanges();
      }
    });
  }

  // ==================================================================
  // EDIT USER (email / phone only)
  // ==================================================================

  openEditUser(user: AdminUser): void {
    this.editingUserId = user._id;
    this.userForm = {
      name: user.name,
      email: user.email,
      phone: user.phone || ''
    };
    this.errorMessage = '';
    this.userModalOpen = true;
  }

  closeUserModal(): void {
    if (this.savingUser) return;
    this.userModalOpen = false;
  }

  saveUser(): void {
    if (!this.userForm.email?.trim()) {
      this.errorMessage = 'Email is required.';
      return;
    }

    this.savingUser = true;
    this.errorMessage = '';

    // `name` is deliberately omitted: the admin console cannot rename an
    // account, and the backend ignores it anyway.
    this.adminService
      .updateUser(this.editingUserId, {
        email: this.userForm.email.trim(),
        phone: this.userForm.phone?.trim() || ''
      })
      .subscribe({
        next: () => {
          this.savingUser = false;
          this.userModalOpen = false;
          this.load();
          this.cdr.detectChanges();
        },
        error: error => {
          this.savingUser = false;
          this.errorMessage = error?.error?.message || 'Could not update the user.';
          this.cdr.detectChanges();
        }
      });
  }

  get pendingCount(): number {
    return this.users.filter(user => user.status === 'PENDING').length;
  }

  statusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'PENDING': return 'status-pending';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }

  unitLabel(unitId: unknown): string {
    if (!unitId) return '—';
    if (typeof unitId === 'object' && unitId !== null) {
      const unit = unitId as { unitNumber?: number | string };
      return unit.unitNumber != null ? `Unit ${unit.unitNumber}` : '—';
    }
    return '—';
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
