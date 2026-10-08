import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (confirmed: boolean) => void;
}

/** Confirmations before a change and toasts after it, drawn once by the shell. */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  readonly toasts = signal<Toast[]>([]);
  readonly confirmation = signal<ConfirmRequest | null>(null);
  private nextId = 1;

  toast(text: string, tone: Toast['tone'] = 'success'): void {
    const id = this.nextId++;
    this.toasts.update((toasts) => [...toasts, { id, text, tone }]);
    setTimeout(() => {
      this.dismiss(id);
    }, 5_000);
  }

  dismiss(id: number): void {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  confirm(
    options: Omit<ConfirmRequest, 'resolve' | 'danger'> & { danger?: boolean },
  ): Promise<boolean> {
    this.confirmation()?.resolve(false);
    return new Promise((resolve) => {
      this.confirmation.set({ danger: false, ...options, resolve });
    });
  }

  answer(confirmed: boolean): void {
    this.confirmation()?.resolve(confirmed);
    this.confirmation.set(null);
  }
}
