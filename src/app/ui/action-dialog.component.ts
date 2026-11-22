import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  linkedSignal,
  viewChild,
} from '@angular/core';

import {
  CONFIRM_WORD,
  type DecisionDraft,
  decisionOf,
  draftProblem,
  emptyDraft,
  INTERNAL_NOTE_MAX,
  leadingReason,
  operationEffect,
  operationForm,
  operationLabel,
  PROFILE_PART_LABELS,
  PUBLIC_MESSAGE_MAX,
  REASON_LABELS,
  SUSPENSION_CHOICES,
} from '../core/moderation-format';
import { optionsOf } from '../core/support-format';
import type { ModerationReason, ProfilePart } from '../core/types';
import { ActionDialogService } from './action-dialog.service';
import { SegmentedComponent } from './segmented.component';

/** The form every moderation decision goes through, mounted once at the root. */
@Component({
  selector: 'nc-action-dialog',
  imports: [SegmentedComponent],
  templateUrl: './action-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionDialogComponent {
  protected readonly actions = inject(ActionDialogService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly reasons = optionsOf(REASON_LABELS);
  protected readonly parts = optionsOf(PROFILE_PART_LABELS);
  protected readonly durations = SUSPENSION_CHOICES;
  protected readonly messageMax = PUBLIC_MESSAGE_MAX;
  protected readonly noteMax = INTERNAL_NOTE_MAX;
  protected readonly confirmWord = CONFIRM_WORD;

  protected readonly draft = linkedSignal<DecisionDraft>(() =>
    emptyDraft(leadingReason(this.actions.request()?.reasons ?? [])),
  );

  protected readonly view = computed(() => {
    const request = this.actions.request();
    if (request === null) {
      return null;
    }
    return {
      request,
      form: operationForm(request.operation),
      title: operationLabel(request.operation, request.targetType),
      effect: operationEffect(request.operation, request.targetType),
    };
  });

  protected readonly problem = computed(() => {
    const request = this.actions.request();
    return request === null ? null : draftProblem(request.operation, this.draft());
  });

  constructor() {
    effect(() => {
      const open = this.actions.request() !== null;
      const dialog = this.dialog().nativeElement;
      if (open && !dialog.open) {
        dialog.showModal();
      } else if (!open && dialog.open) {
        dialog.close();
      }
    });
  }

  protected set<K extends keyof DecisionDraft>(key: K, value: DecisionDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  protected setReason(value: string): void {
    this.set('reason', value === '' ? null : (value as ModerationReason));
  }

  protected togglePart(part: ProfilePart): void {
    this.draft.update((draft) => ({
      ...draft,
      parts: draft.parts.includes(part)
        ? draft.parts.filter((kept) => kept !== part)
        : [...draft.parts, part],
    }));
  }

  protected send(): void {
    const request = this.actions.request();
    if (request === null || this.problem() !== null) {
      return;
    }
    this.actions.answer(decisionOf(request.operation, this.draft()));
  }
}
