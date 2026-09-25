import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';

import { ModalService } from '../../../core/services/modal.service';

/**
 * Renders the active `ModalService` dialog.
 *
 * Mounted once in `App` so a single instance serves the whole application and
 * every page gets the same look without importing anything.
 */
@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.html',
  styleUrl: './dialog.css'
})
export class DialogComponent {
  constructor(public modalService: ModalService) { }

  /** Escape dismisses with the cancel/false value. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalService.activeRequest()) {
      this.modalService.resolve(false);
    }
  }

  /** Clicking the backdrop dismisses the dialog. */
  onBackdropClick(): void {
    this.modalService.resolve(false);
  }
}