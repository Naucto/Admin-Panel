import { describe, expect, it } from 'vitest';

import {
  ACTION_LABELS,
  actionChip,
  CONFIRM_WORD,
  decisionOf,
  type DecisionDraft,
  draftProblem,
  emptyDraft,
  leadingReason,
  operationDone,
  operationEffect,
  operationForm,
  operationLabel,
  operationRequest,
  panelRoute,
  suspensionDays,
  suspensionLabel,
  TARGET_TYPE_LABELS,
  targetName,
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

  it('names the content an operation bears on', () => {
    expect(operationLabel('HIDE', 'COMMENT')).toBe('Hide the comment');
    expect(operationLabel('DELETE', 'PROJECT')).toBe('Delete the game');
    expect(operationLabel('RESTORE', 'COLLECTION')).toBe('Restore the collection');
    expect(operationLabel('SUSPEND', 'COMMENT')).toBe('Suspend the account');
    expect(operationLabel('WARN', 'COLLECTION')).toBe('Warn the account');
  });

  it('says what hiding and deleting a collection come to', () => {
    expect(operationEffect('HIDE', 'COLLECTION')).toBe(
      'Takes the collection off the site. Its owner is told, and it can be restored.',
    );
    expect(operationEffect('DELETE', 'COLLECTION')).toBe(
      'Removes the collection for good. This cannot be undone.',
    );
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

const OWNER = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const GAME = '3f2b8c1e-9d4a-4e6f-8a7b-1c2d3e4f5a6b';
const COMMENT = 'b4d1f0a2-5c3e-4f6a-9b8d-0e1f2a3b4c5d';
const COLLECTION = 'e8a1c7d4-2b6f-4a39-8c5e-9f0d1b2a3c4e';

describe('where an operation goes', () => {
  const comment = { type: 'COMMENT', id: COMMENT, ownerId: OWNER } as const;
  const game = { type: 'PROJECT', id: GAME, ownerId: OWNER } as const;
  const profile = { type: 'USER', id: OWNER, ownerId: OWNER } as const;
  const collection = { type: 'COLLECTION', id: COLLECTION, ownerId: OWNER } as const;

  it('dismisses the case of the target', () => {
    expect(operationRequest('DISMISS', comment)).toEqual({
      method: 'POST',
      path: `/admin/moderation/cases/COMMENT/${COMMENT}/dismiss`,
    });
  });

  it('hides, restores and deletes a collection under its own root', () => {
    expect(operationRequest('HIDE', collection)).toEqual({
      method: 'POST',
      path: `/admin/moderation/collections/${COLLECTION}/hide`,
    });
    expect(operationRequest('RESTORE', collection)).toEqual({
      method: 'POST',
      path: `/admin/moderation/collections/${COLLECTION}/restore`,
    });
    expect(operationRequest('DELETE', collection)).toEqual({
      method: 'DELETE',
      path: `/admin/moderation/collections/${COLLECTION}`,
    });
  });

  it('dismisses the case of a collection and reaches its owner', () => {
    expect(operationRequest('DISMISS', collection)?.path).toBe(
      `/admin/moderation/cases/COLLECTION/${COLLECTION}/dismiss`,
    );
    expect(operationRequest('SUSPEND', collection)?.path).toBe(
      `/admin/moderation/accounts/${OWNER}/suspend`,
    );
    expect(operationRequest('WARN', { ...collection, ownerId: null })).toBeNull();
  });

  it('hides, restores and deletes the game or the comment itself', () => {
    expect(operationRequest('HIDE', game)?.path).toBe(`/admin/moderation/projects/${GAME}/hide`);
    expect(operationRequest('RESTORE', comment)?.path).toBe(
      `/admin/moderation/comments/${COMMENT}/restore`,
    );
    expect(operationRequest('DELETE', game)).toEqual({
      method: 'DELETE',
      path: `/admin/moderation/projects/${GAME}`,
    });
  });

  it('sends an account operation to the owner of the target', () => {
    expect(operationRequest('WARN', comment)?.path).toBe(
      `/admin/moderation/accounts/${OWNER}/warn`,
    );
    expect(operationRequest('CLEAR_PROFILE', profile)?.path).toBe(
      `/admin/moderation/accounts/${OWNER}/clear-profile`,
    );
    expect(operationRequest('DELETE_ACCOUNT', game)).toEqual({
      method: 'DELETE',
      path: `/admin/moderation/accounts/${OWNER}`,
    });
  });

  it('has nowhere to send what bears on nothing', () => {
    expect(operationRequest('SUSPEND', { ...game, ownerId: null })).toBeNull();
    expect(operationRequest('HIDE', profile)).toBeNull();
  });

  it.each(OPERATIONS)('says what %s did', (operation) => {
    expect(operationDone(operation, 'COMMENT')).toMatch(/\.$/);
  });

  it('says what was done to a collection', () => {
    expect(operationDone('HIDE', 'COLLECTION')).toBe('The collection is hidden.');
    expect(operationDone('RESTORE', 'COLLECTION')).toBe('The collection is back on the site.');
    expect(operationDone('DELETE', 'COLLECTION')).toBe('The collection is deleted.');
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

  it('calls a target by its label, or by what it is and its short id when it has none', () => {
    expect(targetName({ type: 'PROJECT', id: GAME, label: 'Rain Room' })).toBe('Rain Room');
    expect(targetName({ type: 'PROJECT', id: GAME, label: null })).toBe('Game 3f2b8c1e');
    expect(targetName({ type: 'COMMENT', id: COMMENT, label: '' })).toBe('Comment b4d1f0a2');
  });

  it('links an account and a game to their page, and a comment or a collection nowhere', () => {
    expect(panelRoute('USER', OWNER)).toEqual(['/moderation/users', OWNER]);
    expect(panelRoute('PROJECT', GAME)).toEqual(['/moderation/games', GAME]);
    expect(panelRoute('COMMENT', COMMENT)).toBeNull();
    expect(panelRoute('COLLECTION', COLLECTION)).toBeNull();
  });

  it('names a collection among what is reported', () => {
    expect(TARGET_TYPE_LABELS.COLLECTION).toBe('Collection');
    expect(Object.keys(TARGET_TYPE_LABELS)).toEqual(['USER', 'PROJECT', 'COMMENT', 'COLLECTION']);
  });

  it('names what was done to a collection', () => {
    expect(ACTION_LABELS.COLLECTION_HIDDEN).toBe('Hid the collection');
    expect(ACTION_LABELS.COLLECTION_RESTORED).toBe('Restored the collection');
    expect(ACTION_LABELS.COLLECTION_DELETED).toBe('Deleted the collection');
  });

  it('colours an action by what it did', () => {
    expect(actionChip('ACCOUNT_SUSPENDED')).toBe('nc-chip nc-chip-danger');
    expect(actionChip('PROJECT_RESTORED')).toBe('nc-chip nc-chip-ok');
    expect(actionChip('COLLECTION_HIDDEN')).toBe('nc-chip nc-chip-danger');
    expect(actionChip('COLLECTION_RESTORED')).toBe('nc-chip nc-chip-ok');
    expect(actionChip('COLLECTION_DELETED')).toBe('nc-chip nc-chip-danger');
  });

  it('offers the reason reported most, the first one on a tie', () => {
    expect(leadingReason(['SPAM', 'HATE', 'HATE'])).toBe('HATE');
    expect(leadingReason(['SPAM', 'HATE'])).toBe('SPAM');
    expect(leadingReason([])).toBeNull();
  });
});
