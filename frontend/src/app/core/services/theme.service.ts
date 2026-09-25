import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'civicsync-theme';

/**
 * SINGLE source of truth for the app theme.
 *
 * The theme is expressed as the `dark-mode` class on <html>, which every
 * component styles against via `html.dark-mode` / `:host-context(html.dark-mode)`
 * and the CSS variables declared in `src/styles.css`. Nothing else in the app
 * may toggle that class.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly darkState = signal(false);

  /** Reactive read access for templates/components. */
  readonly darkMode = this.darkState.asReadonly();

  constructor() {
    this.setDark(this.resolveInitialTheme(), { persist: false });
  }

  /** Backwards-compatible synchronous getter. */
  get isDark(): boolean {
    return this.darkState();
  }

  toggleTheme(): void {
    this.setDark(!this.darkState());
  }

  setDark(isDark: boolean, options: { persist?: boolean } = {}): void {
    const { persist = true } = options;

    this.darkState.set(isDark);

    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    }

    this.applyThemeClass(isDark);
  }

  private resolveInitialTheme(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;

    // Migrate legacy keys from earlier versions.
    if (localStorage.getItem('theme') === 'dark') return true;
    if (localStorage.getItem('civicsync-dark-mode') === 'true') return true;

    return false;
  }

  private applyThemeClass(isDark: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('dark-mode', isDark);
  }
}
