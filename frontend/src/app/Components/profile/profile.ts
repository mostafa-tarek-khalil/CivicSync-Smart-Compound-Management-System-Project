import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../Services/auth-service';

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
  imports: [CommonModule, FormsModule],
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

  constructor(
    private authService: AuthService,
    private router: Router,
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

  get homeLink(): string {
    switch (this.profile?.role) {
      case 'SECURITY': return '/security-dashboard';
      case 'RESIDENT': return '/chat';
      case 'TECHNICIAN': return '/';
      default: return '/';
    }
  }

  goHome(): void {
    this.router.navigate([this.homeLink]);
  }
}