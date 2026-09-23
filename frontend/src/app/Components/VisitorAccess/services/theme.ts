import { Injectable } from '@angular/core';

const THEME_KEY = 'civicsync-theme';

/**
 * Single source of truth for the app theme.
 *
 * The theme is expressed as the `dark-mode` class on the <html> element, which
 * every component styles against via `:host-context(html.dark-mode)`.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  isDark = false;

  constructor() {
    this.isDark = this.resolveInitialTheme();
    this.applyTheme();
  }

  toggleTheme(): void {
    this.setDark(!this.isDark);
  }

  setDark(isDark: boolean): void {
    this.isDark = isDark;
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private resolveInitialTheme(): boolean {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;

    // Migrate legacy keys from earlier versions.
    if (localStorage.getItem('theme') === 'dark') return true;
    if (localStorage.getItem('civicsync-dark-mode') === 'true') return true;

    return false;
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark-mode', this.isDark);
  }
}