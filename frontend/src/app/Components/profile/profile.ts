import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar';

interface ProfileData {
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  profileImage: string | null;
  unitId: string | null;
  specializations: string[];
  rating: number;
  totalReviews: number;
  lastLoginAt: string | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  profile: ProfileData | null = null;

  // Editable fields
  name = '';
  phone = '';

  // ---------- Change password ----------
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showPasswords = false;
  changingPassword = false;
  passwordError = '';
  passwordSuccess = '';

  // ---------- Profile picture ----------
  uploadingAvatar = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.getMe().subscribe({
      next: response => {
        this.profile = response.data;
        this.name = response.data.name || '';
        this.phone = response.data.phone || '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Could not load your profile.';
        this.cdr.detectChanges();
      }
    });
  }

  get initials(): string {
    return (this.name || this.profile?.email || 'U')
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get roleLabel(): string {
    const role = this.profile?.role || '';
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  /**
   * Technician rating, rounded to a single decimal.
   *
   * The stored value is an exact average (`totalRating / totalReviews`), so it
   * arrives as something like 4.333333333333333. Showing that raw number was
   * the bug — one digit after the star is all the identity card needs.
   */
  get ratingLabel(): string {
    const rating = Number(this.profile?.rating ?? 0);

    if (!Number.isFinite(rating) || rating <= 0) {
      return 'No ratings yet';
    }

    return rating.toFixed(1);
  }

  get isDirty(): boolean {
    if (!this.profile) return false;
    return (
      this.name.trim() !== (this.profile.name || '') ||
      this.phone.trim() !== (this.profile.phone || '')
    );
  }

  save(): void {
    if (this.saving || !this.isDirty) {
      return;
    }

    if (this.name.trim().length < 2) {
      this.errorMessage = 'Name must be at least 2 characters.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService
      .updateProfile({ name: this.name.trim(), phone: this.phone.trim() })
      .subscribe({
        next: response => {
          this.profile = response.data;
          this.name = response.data.name;
          this.phone = response.data.phone || '';
          this.saving = false;
          this.successMessage = 'Profile updated successfully.';
          this.cdr.detectChanges();
        },
        error: error => {
          this.saving = false;
          this.errorMessage = error?.error?.message || 'Could not update your profile.';
          this.cdr.detectChanges();
        }
      });
  }

  reset(): void {
    if (!this.profile) return;
    this.name = this.profile.name || '';
    this.phone = this.profile.phone || '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ==================================================================
  // PROFILE PICTURE
  // ==================================================================

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || this.uploadingAvatar) {
      return;
    }

    // Mirrors the backend limit so the user gets an instant answer instead of
    // uploading 6 MB only to be rejected.
    if (file.size > 5 * 1024 * 1024) {
      this.modalService.error('The image must be 5 MB or smaller.');
      input.value = '';
      return;
    }

    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      this.modalService.error('Please choose a JPEG, PNG, WEBP or GIF image.');
      input.value = '';
      return;
    }

    this.uploadingAvatar = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.uploadProfileImage(file).subscribe({
      next: response => {
        this.uploadingAvatar = false;
        this.profile = response.data;
        this.successMessage = 'Profile picture updated.';
        input.value = '';
        this.cdr.detectChanges();
      },
      error: error => {
        this.uploadingAvatar = false;
        input.value = '';
        this.errorMessage =
          error?.error?.message || 'Could not upload the picture.';
        this.cdr.detectChanges();
      }
    });
  }

  // ==================================================================
  // CHANGE PASSWORD
  // ==================================================================

  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.currentPassword) {
      this.passwordError = 'Enter your current password.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError = 'New password must be at least 8 characters.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'New password and confirmation do not match.';
      return;
    }

    if (this.newPassword === this.currentPassword) {
      this.passwordError = 'New password must be different from the current one.';
      return;
    }

    this.changingPassword = true;

    this.authService
      .changePassword(this.currentPassword, this.newPassword)
      .subscribe({
        next: response => {
          this.changingPassword = false;
          this.passwordSuccess =
            response?.message || 'Password updated successfully.';
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.cdr.detectChanges();
        },
        error: error => {
          this.changingPassword = false;
          this.passwordError =
            error?.error?.message || 'Could not update your password.';
          this.cdr.detectChanges();
        }
      });
  }

  get homeLink(): string {
    return this.authService.homeRoute;
  }

  goHome(): void {
    this.router.navigate([this.homeLink]);
  }
}