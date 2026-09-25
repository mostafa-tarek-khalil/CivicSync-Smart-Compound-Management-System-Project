import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Layout the loader should fill. */
export type LoadingVariant = 'page' | 'section' | 'inline';

/**
 * Shared loading indicator.
 *
 * Every API-driven screen renders this while its request is in flight so no
 * page ever shows a blank body or (worse) stale mock rows.
 */
@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {
  readonly message = input('Loading…');
  readonly variant = input<LoadingVariant>('section');
}
