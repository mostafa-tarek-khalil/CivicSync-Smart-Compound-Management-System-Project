import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css'
})
export class RegisterPage {

  name = '';
  phone = '';
  email = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;

  submitted = false;
  errorMessage = '';

  constructor(private router: Router) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  clearError(): void {
    this.errorMessage = '';
  }

  get nameError(): string {
    if (!this.submitted && !this.name) {
      return '';
    }

    if (!this.name.trim()) {
      return 'Please enter your full name.';
    }

    if (this.name.trim().length < 3) {
      return 'Name must be at least 3 characters.';
    }

    return '';
  }

  get phoneError(): string {
    if (!this.submitted && !this.phone) {
      return '';
    }

    if (!this.phone.trim()) {
      return 'Please enter your phone number.';
    }

    if (!/^01[0125][0-9]{8}$/.test(this.phone.trim())) {
      return 'Please enter a valid Egyptian phone number.';
    }

    return '';
  }

  get emailError(): string {
    if (!this.submitted && !this.email) {
      return '';
    }

    if (!this.email.trim()) {
      return 'Please enter your email address.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      return 'Please enter a valid email address.';
    }

    return '';
  }

  get passwordError(): string {
    if (!this.submitted && !this.password) {
      return '';
    }

    if (!this.password) {
      return 'Please enter a password.';
    }

    if (this.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }

    return '';
  }

  get confirmPasswordError(): string {
    if (!this.submitted && !this.confirmPassword) {
      return '';
    }

    if (!this.confirmPassword) {
      return 'Please confirm your password.';
    }

    if (this.password !== this.confirmPassword) {
      return 'Passwords do not match.';
    }

    return '';
  }

  isValid(): boolean {
    return (
      !this.nameError &&
      !this.phoneError &&
      !this.emailError &&
      !this.passwordError &&
      !this.confirmPasswordError
    );
  }

  continue(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.isValid()) {
      this.errorMessage = 'Please fix the highlighted fields before continuing.';
      return;
    }

    const registerData = {
      name: this.name.trim(),
      phone: this.phone.trim(),
      email: this.email.trim(),
      password: this.password
    };

    sessionStorage.setItem(
      'civicsync_register',
      JSON.stringify(registerData)
    );

    this.router.navigate(['/register/role']);
  }
}