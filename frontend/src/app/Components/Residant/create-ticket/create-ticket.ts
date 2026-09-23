import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';

import { MaintenanceTicketService } from '../../../Services/maintenance-ticket';
import { ICreateTicketDto, TTicketCategory, TTicketPriority } from '../../../Models/imaintenance-ticket';

interface ICategoryOption {
  value: TTicketCategory;
  label: string;
  icon: string;
}

interface IPriorityOption {
  value: TTicketPriority;
  label: string;
  hint: string;
  dotClass: string;
}

@Component({
  selector: 'app-create-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule ,  NavbarComponent],
  templateUrl: './create-ticket.html',
  styleUrl: './create-ticket.css',
})
export class CreateTicket {

 
  categories: ICategoryOption[] = [
    { value: 'PLUMBING',    label: 'Plumbing',          icon: 'fa-solid fa-droplet' },
    { value: 'ELECTRICITY', label: 'Electricity',       icon: 'fa-solid fa-bolt' },
    { value: 'ELEVATOR',    label: 'Elevator',          icon: 'fa-solid fa-arrows-up-down' },
    { value: 'AC',          label: 'Air Conditioning',  icon: 'fa-solid fa-snowflake' },
    { value: 'GENERAL',     label: 'General',           icon: 'fa-solid fa-scissors' },
  ];

  priorities: IPriorityOption[] = [
    { value: 'LOW',    label: 'Low',    hint: 'Not blocking anything — schedule it whenever.', dotClass: 'low' },
    { value: 'MEDIUM', label: 'Medium', hint: 'Standard response within a day or two.',         dotClass: 'medium' },
    { value: 'HIGH',   label: 'High',   hint: 'Affecting daily use, needs attention soon.',     dotClass: 'high' },
    { value: 'URGENT', label: 'Urgent', hint: 'Hazard or major leak — dispatch immediately.',   dotClass: 'urgent' },
  ];

 
  title = '';
  description = '';
  selectedCategory: TTicketCategory = 'AC';
  selectedPriority: TTicketPriority = 'MEDIUM';
  descriptionMaxLength = 1000;

 
  mediaFile: File | null = null;
  mediaPreviewUrl: string | ArrayBuffer | null = null;

  isSubmitting = false;
  errorMessage = '';

  constructor(
    private ticketService: MaintenanceTicketService,
    private router: Router
  ) {}

  selectCategory(value: TTicketCategory): void {
    this.selectedCategory = value;
  }

  selectPriority(value: TTicketPriority): void {
    this.selectedPriority = value;
  }

  onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.mediaFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.mediaPreviewUrl = reader.result);
    reader.readAsDataURL(file);
  }

  removeMedia(): void {
    this.mediaFile = null;
    this.mediaPreviewUrl = null;
  }

  goBack(): void {
    this.router.navigate(['/maintenance']);
  }

  submitRequest(): void {
    if (!this.title.trim()) {
      this.errorMessage = 'Please add an issue title.';
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const dto: ICreateTicketDto = {
      title: this.title.trim(),
      category: this.selectedCategory,
      description: this.description.trim(),
      priority: this.selectedPriority,
      attachmentUrl: null 
    };

    this.ticketService.createTicket(dto).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/maintenance']);
      },
      error: (err) => {
        console.error('Error submitting ticket:', err);
        this.isSubmitting = false;
        this.errorMessage =
          err.error?.message || 'Something went wrong while submitting the request.';
      }
    });
  }
}