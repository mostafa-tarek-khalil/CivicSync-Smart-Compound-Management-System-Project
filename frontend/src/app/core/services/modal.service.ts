import { Injectable, signal } from '@angular/core';

export type ModalVariant = 'info' | 'success' | 'warning' | 'danger' | 'confirm';

export interface ModalButton {
  label: string;
  /** Value resolved when this button is chosen. */
  value: boolean;
  /** Visual emphasis. */
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export interface ModalRequest {
  title: string;
  message: string;
  variant: ModalVariant;
  icon: string;
  buttons: ModalButton[];
}

/**
 * THE app-wide dialog service.
 *
 * Every replaceable `alert()` / `confirm()` call goes through here so the app
 * never shows a browser-native popup again. Components render the dialog from
 * `activeRequest` and resolve it through `resolve()`.
 */
@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly requestSignal = signal<ModalRequest | null>(null);

  /** Currently displayed dialog, or null when nothing is open. */
  readonly activeRequest = this.requestSignal.asReadonly();

  private resolver: ((value: boolean) => void) | null = null;

  /** Simple information dialog with a single acknowledge button. */
  info(message: string, title = 'Information'): Promise<boolean> {
    return this.open({
      title,
      message,
      variant: 'info',
      icon: 'info',
      buttons: [{ label: 'OK', value: true, kind: 'primary' }],
    });
  }

  success(message: string, title = 'Success'): Promise<boolean> {
    return this.open({
      title,
      message,
      variant: 'success',
      icon: 'check_circle',
      buttons: [{ label: 'OK', value: true, kind: 'primary' }],
    });
  }

  warning(message: string, title = 'Warning'): Promise<boolean> {
    return this.open({
      title,
      message,
      variant: 'warning',
      icon: 'warning',
      buttons: [{ label: 'OK', value: true, kind: 'primary' }],
    });
  }

  error(message: string, title = 'Something went wrong'): Promise<boolean> {
    return this.open({
      title,
      message,
      variant: 'danger',
      icon: 'error',
      buttons: [{ label: 'Close', value: true, kind: 'primary' }],
    });
  }

  /** Replaces `confirm()`: resolves true only when the user agrees. */
  confirm(options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  }): Promise<boolean> {
    return this.open({
      title: options.title || 'Please confirm',
      message: options.message,
      variant: options.danger ? 'danger' : 'confirm',
      icon: options.danger ? 'delete' : 'help',
      buttons: [
        {
          label: options.cancelLabel || 'Cancel',
          value: false,
          kind: 'secondary',
        },
        {
          label: options.confirmLabel || 'Confirm',
          value: true,
          kind: options.danger ? 'danger' : 'primary',
        },
      ],
    });
  }

  /** Called by the dialog component when a button is clicked. */
  resolve(value: boolean): void {
    const resolver = this.resolver;

    this.resolver = null;
    this.requestSignal.set(null);

    resolver?.(value);
  }

  private open(request: ModalRequest): Promise<boolean> {
    // A second dialog opening while one is up would orphan the first promise,
    // so the pending dialog is auto-dismissed first.
    this.resolver?.(false);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.requestSignal.set(request);
    });
  }
}