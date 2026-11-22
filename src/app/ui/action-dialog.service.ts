import { Injectable, signal } from '@angular/core';

import type {
  ModerationDecision,
  ModerationOperation,
  ModerationReason,
  ModerationTargetType,
} from '../core/types';

export interface ActionRequest {
  operation: ModerationOperation;
  targetType: ModerationTargetType;
  /** What the decision bears on, as the dialog names it under its title. */
  subject: string;
  /** Open reports on the target. Above zero, the dialog offers to close them with the decision. */
  openFlags: number;
  /** What the target was reported for, so the reason reported most is offered first. */
  reasons: readonly ModerationReason[];
  resolve: (decision: ModerationDecision | null) => void;
}

/** Asks staff for the reason, the message and the note of a moderation decision. */
@Injectable({ providedIn: 'root' })
export class ActionDialogService {
  readonly request = signal<ActionRequest | null>(null);

  /** Resolves with the body to send, or null when staff backed out. */
  ask(
    options: Omit<ActionRequest, 'resolve' | 'openFlags' | 'reasons'> &
      Partial<Pick<ActionRequest, 'openFlags' | 'reasons'>>,
  ): Promise<ModerationDecision | null> {
    this.request()?.resolve(null);
    return new Promise((resolve) => {
      this.request.set({ openFlags: 0, reasons: [], ...options, resolve });
    });
  }

  answer(decision: ModerationDecision | null): void {
    this.request()?.resolve(decision);
    this.request.set(null);
  }
}
