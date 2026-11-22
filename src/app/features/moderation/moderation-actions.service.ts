import { inject, Injectable, signal } from '@angular/core';

import { errorMessage } from '../../core/api-error';
import { CaseCountStore } from '../../core/case-count.store';
import { ModerationApi } from '../../core/moderation.api';
import {
  bearsOnAccount,
  operationDone,
  operationRequest,
  TARGET_TYPE_LABELS,
} from '../../core/moderation-format';
import type {
  ModerationAccountRef,
  ModerationOperation,
  ModerationReason,
  ModerationTargetType,
} from '../../core/types';
import { ActionDialogService } from '../../ui/action-dialog.service';
import { FeedbackService } from '../../ui/feedback.service';

/** What a decision bears on, as the screen offering it knows it. */
export interface ActionTarget {
  type: ModerationTargetType;
  id: number;
  label: string | null;
  owner: Pick<ModerationAccountRef, 'id' | 'username'> | null;
  openFlags: number;
  reasons: readonly ModerationReason[];
}

/** Runs a moderation decision the same way from every screen: ask, send, say what happened. */
@Injectable({ providedIn: 'root' })
export class ModerationActions {
  private readonly api = inject(ModerationApi);
  private readonly dialog = inject(ActionDialogService);
  private readonly feedback = inject(FeedbackService);
  private readonly caseCount = inject(CaseCountStore);

  readonly busy = signal(false);

  /** Resolves true once the decision went through, so the screen knows to read its data again. */
  async run(operation: ModerationOperation, target: ActionTarget): Promise<boolean> {
    const request = operationRequest(operation, {
      type: target.type,
      id: target.id,
      ownerId: target.owner?.id ?? null,
    });
    if (request === null) {
      return false;
    }
    const decision = await this.dialog.ask({
      operation,
      targetType: target.type,
      subject: this.subject(operation, target),
      openFlags: target.openFlags,
      reasons: target.reasons,
    });
    if (decision === null) {
      return false;
    }
    this.busy.set(true);
    try {
      await this.api.decide(request, decision);
      this.feedback.toast(operationDone(operation, target.type));
      void this.caseCount.refresh();
      return true;
    } catch (error) {
      this.feedback.toast(errorMessage(error), 'error');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private subject(operation: ModerationOperation, target: ActionTarget): string {
    if (target.owner && (bearsOnAccount(operation) || target.type === 'USER')) {
      return `Account @${target.owner.username}`;
    }
    return `${TARGET_TYPE_LABELS[target.type]} ${target.label ? `"${target.label}"` : `#${target.id}`}`;
  }
}
