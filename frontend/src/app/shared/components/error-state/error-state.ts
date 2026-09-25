import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Shared error state.
 *
 * Rendered when an API call fails. Always offers a retry so a failed request
 * can never leave the user staring at an empty screen — and never causes the
 * page to fall back to local dummy data.
 */
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input('We could not load this data. Please try again.');
  readonly retryLabel = input('Try again');

  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
