import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Shared empty state.
 *
 * Rendered when an API legitimately returns an empty collection — never
 * replaced by a fallback mock array.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  readonly title = input('Nothing here yet');
  readonly message = input('');
  /** Material Symbols ligature, e.g. "inbox". */
  readonly icon = input('inbox');

  readonly actionLabel = input('');

  readonly action = output<void>();

  onAction(): void {
    this.action.emit();
  }
}
