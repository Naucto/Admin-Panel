import { describe, expect, it } from 'vitest';

import {
  actionChip,
  CONFIRM_WORD,
  decisionOf,
  type DecisionDraft,
  draftProblem,
  emptyDraft,
  leadingReason,
  operationForm,
  operationLabel,
  panelRoute,
  suspensionDays,
  suspensionLabel,
} from './moderation-format';
import type { ModerationOperation } from './types';

const OPERATIONS: ModerationOperation[] = [
  'DISMISS',
  'HIDE',
  'RESTORE',
  'DELETE',
  'WARN',
  'SUSPEND',
  'REINSTATE',
  'CLEAR_PROFILE',
  'DELETE_ACCOUNT',
];

const filled = (changes: Partial<DecisionDraft> = {}): DecisionDraft => ({
  ...emptyDraft('SPAM'),
  publicMessage: '  Keep it friendly.  ',
  internalNote: '  Third time.  ',
  parts: ['PICTURE'],
  confirmation: CONFIRM_WORD,
  ...changes,
});

describe('what each operation asks', () => {
  it('asks a reason for every decision and none to dismiss or lift one', () => {
    expect(OPERATIONS.filter((operation) => !operationForm(operation).reason)).toEqual([
      'DISMISS',
      'RESTORE',
      'REINSTATE',
    ]);
  });

  it('asks to type the word before a deletion only', () => {
    expect(OPERATIONS.filter((operation) => operationForm(operation).typeToConfirm)).toEqual([
      'DELETE',
      'DELETE_ACCOUNT',
    ]);
  });

  it('requires a message to warn or suspend', () => {
    expect(
      OPERATIONS.filter((operation) => operationForm(operation).message === 'required'),
    ).toEqual(['WARN', 'SUSPEND']);
  });

  it('names the game or the comment an operation bears on', () => {
    expect(operationLabel('HIDE', 'COMMENT')).toBe('Hide the comment');
    expect(operationLabel('DELETE', 'PROJECT')).toBe('Delete the game');
    expect(operationLabel('SUSPEND', 'COMMENT')).toBe('Suspend the account');
  });
});

describe('what keeps a draft from going', () => {
  it.each(OPERATIONS)('lets a filled %s draft go', (operation) => {
    expect(draftProblem(operation, filled())).toBeNull();
  });

  it('lets an empty dismissal go', () => {
    expect(draftProblem('DISMISS', emptyDraft())).toBeNull();
  });

  it('holds a decision with no reason', () => {
    expect(draftProblem('HIDE', filled({ reason: null }))).toBe('Choose a reason');
  });

  it('holds a warning whose message is only spaces', () => {
    expect(draftProblem('WARN', filled({ publicMessage: '   ' }))).not.toBeNull();
    expect(draftProblem('HIDE', filled({ publicMessage: '' }))).toBeNull();
  });

  it('holds a profile clearing that names no part', () => {
    expect(draftProblem('CLEAR_PROFILE', filled({ parts: [] }))).toBe('Choose what to clear');
  });

  it('holds a deletion until the word is typed exactly', () => {
    expect(draftProblem('DELETE', filled({ confirmation: 'delete' }))).not.toBeNull();
    expect(draftProblem('DELETE_ACCOUNT', filled({ confirmation: '' }))).not.toBeNull();
  });
});

describe('what a decision sends', () => {
  it('sends a dismissal its note and nothing else', () => {
    expect(decisionOf('DISMISS', filled())).toEqual({ internalNote: 'Third time.' });
    expect(decisionOf('DISMISS', emptyDraft())).toEqual({});
  });

  it('trims the text and leaves an empty message out', () => {
    expect(decisionOf('HIDE', filled({ publicMessage: '  ' }))).toEqual({
      reason: 'SPAM',
      internalNote: 'Third time.',
      resolveFlags: true,
    });
  });

  it('sends a lift its message and no reason', () => {
    expect(decisionOf('RESTORE', filled())).toEqual({
      publicMessage: 'Keep it friendly.',
      internalNote: 'Third time.',
    });
  });

  it('sends the days of a suspension, and none when it has no end', () => {
    expect(decisionOf('SUSPEND', filled({ duration: '30' })).durationDays).toBe(30);
    expect(decisionOf('SUSPEND', filled({ duration: 'indefinite' }))).not.toHaveProperty(
      'durationDays',
    );
    expect(decisionOf('WARN', filled())).not.toHaveProperty('durationDays');
  });

  it('sends the parts of a profile clearing', () => {
    expect(decisionOf('CLEAR_PROFILE', filled()).parts).toEqual(['PICTURE']);
    expect(decisionOf('HIDE', filled())).not.toHaveProperty('parts');
  });

  it('sends an account deletion its confirmation and no message', () => {
    expect(decisionOf('DELETE_ACCOUNT', filled({ removePublishedGames: true }))).toEqual({
      reason: 'SPAM',
      internalNote: 'Third time.',
      resolveFlags: true,
      removePublishedGames: true,
      confirmation: 'DELETE',
    });
  });

  it('keeps the confirmation word out of a content deletion', () => {
    expect(decisionOf('DELETE', filled())).not.toHaveProperty('confirmation');
  });
});

describe('labels and links', () => {
  it('reads a suspension length', () => {
    expect(suspensionDays('7')).toBe(7);
    expect(suspensionDays('indefinite')).toBeNull();
    expect(suspensionLabel({ since: '2026-11-01T00:00:00.000Z', until: null })).toBe(
      'Until staff reinstate it',
    );
    expect(
      suspensionLabel({ since: '2026-11-01T00:00:00.000Z', until: '2026-11-08T00:00:00.000Z' }),
    ).toMatch(/^Until .+ UTC$/);
  });

  it('links an account and a game to their page, and a comment nowhere', () => {
    expect(panelRoute('USER', 4)).toEqual(['/moderation/users', 4]);
    expect(panelRoute('PROJECT', 9)).toEqual(['/moderation/games', 9]);
    expect(panelRoute('COMMENT', 2)).toBeNull();
  });

  it('colours an action by what it did', () => {
    expect(actionChip('ACCOUNT_SUSPENDED')).toBe('nc-chip nc-chip-danger');
    expect(actionChip('PROJECT_RESTORED')).toBe('nc-chip nc-chip-ok');
  });

  it('offers the reason reported most, the first one on a tie', () => {
    expect(leadingReason(['SPAM', 'HATE', 'HATE'])).toBe('HATE');
    expect(leadingReason(['SPAM', 'HATE'])).toBe('SPAM');
    expect(leadingReason([])).toBeNull();
  });
});
