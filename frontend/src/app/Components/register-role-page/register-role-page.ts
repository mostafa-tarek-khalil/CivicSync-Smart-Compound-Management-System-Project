import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

interface RoleOption {
  value: 'RESIDENT' | 'TECHNICIAN' | 'SECURITY';
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-register-role-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register-role-page.html',
  styleUrl: './register-role-page.css'
})
export class RegisterRolePage {
  selectedRole: 'RESIDENT' | 'TECHNICIAN' | 'SECURITY' | null = null;
  errorMessage = '';

  readonly roles: RoleOption[] = [
    {
      value: 'RESIDENT',
      title: 'Resident',
      description: 'Manage your unit, maintenance requests, visitors and compound services.',
      icon: 'home'
    },
    {
      value: 'TECHNICIAN',
      title: 'Technician',
      description: 'Handle maintenance requests, offers, assigned tasks and resident reviews.',
      icon: 'tools'
    },
    {
      value: 'SECURITY',
      title: 'Security',
      description: 'Manage visitor access, scan QR codes and monitor compound visits.',
      icon: 'shield'
    }
  ];

  constructor(private router: Router) {
    this.loadSavedRole();
  }

  selectRole(role: 'RESIDENT' | 'TECHNICIAN' | 'SECURITY'): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  continue(): void {
    if (!this.selectedRole) {
      this.errorMessage = 'Please select your role to continue.';
      return;
    }

    const savedData = sessionStorage.getItem('civicsync_register');

    if (!savedData) {
      this.router.navigate(['/register']);
      return;
    }

    try {
      const registerData = JSON.parse(savedData);
      registerData.role = this.selectedRole;
      sessionStorage.setItem('civicsync_register', JSON.stringify(registerData));
      this.router.navigate(['/register/details']);
    } catch {
      sessionStorage.removeItem('civicsync_register');
      this.router.navigate(['/register']);
    }
  }

  goBack(): void {
    this.router.navigate(['/register']);
  }

  private loadSavedRole(): void {
    const savedData = sessionStorage.getItem('civicsync_register');

    if (!savedData) {
      return;
    }

    try {
      const registerData = JSON.parse(savedData);

      if (registerData.role === 'RESIDENT' || registerData.role === 'TECHNICIAN' || registerData.role === 'SECURITY') {
        this.selectedRole = registerData.role;
      }
    } catch {
      sessionStorage.removeItem('civicsync_register');
    }
  }
}