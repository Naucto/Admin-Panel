import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../core/auth.store';
import { ModerationApi } from '../../core/moderation.api';
import type {
  CaseDetail,
  ModerationAccountRef,
  ModerationOperation,
  ModerationTargetType,
} from '../../core/types';
import { ActionDialogService } from '../../ui/action-dialog.service';
import CasePage from './case.page';

const COLLECTION = 'e8a1c7d4-2b6f-4a39-8c5e-9f0d1b2a3c4e';
const FIRST_GAME = '3f2b8c1e-9d4a-4e6f-8a7b-1c2d3e4f5a6b';
const SECOND_GAME = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const OWNER: ModerationAccountRef = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  username: 'mira',
  nickname: null,
  role: 'User',
  deleted: false,
  profileUrl: null,
  email: null,
};

function caseOf(
  type: ModerationTargetType,
  allowedActions: ModerationOperation[],
  changes: Partial<CaseDetail> = {},
): CaseDetail {
  return {
    target: {
      type,
      id: COLLECTION,
      state: 'VISIBLE',
      label: 'Cosy puzzles',
      owner: OWNER,
      projectId: null,
      projectName: null,
      playUrl: null,
      previewPlayUrl: null,
      previewEditUrl: null,
    },
    status: 'OPEN',
    openFlags: 1,
    totalFlags: 1,
    reasons: ['SPAM'],
    firstFlaggedAt: '2026-11-20T10:00:00.000Z',
    lastFlaggedAt: '2026-11-20T10:00:00.000Z',
    current: { title: 'Cosy puzzles', body: 'Short games for a rainy day.' },
    visibility: 'UNLISTED',
    games: [
      { id: FIRST_GAME, name: 'Rain Room' },
      { id: SECOND_GAME, name: 'Tea Tiles' },
    ],
    flags: [
      {
        id: 'b4d1f0a2-5c3e-4f6a-9b8d-0e1f2a3b4c5d',
        reporter: { ...OWNER, id: '11111111-2222-4333-8444-555555555555', username: 'noor' },
        reason: 'SPAM',
        details: null,
        snapshot: { title: 'Cosy puzzles', body: 'Short games for a rainy day.' },
        status: 'OPEN',
        createdAt: '2026-11-20T10:00:00.000Z',
        resolvedAt: null,
        resolvedBy: null,
      },
    ],
    history: [],
    ownerHistory: [],
    allowedActions,
    ...changes,
  };
}

const read = vi.fn<(type: ModerationTargetType, id: string) => Promise<CaseDetail>>();
const decide = vi.fn<ModerationApi['decide']>();
const ask = vi.fn<ActionDialogService['ask']>();

async function render(detail: CaseDetail, canAct: boolean): Promise<HTMLElement> {
  read.mockReset().mockResolvedValue(detail);
  decide.mockReset().mockResolvedValue();
  ask.mockReset().mockResolvedValue({ reason: 'SPAM', resolveFlags: true });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ModerationApi,
        useValue: { case: read, decide, openCaseCount: () => Promise.reject(new Error('down')) },
      },
      { provide: ActionDialogService, useValue: { ask } },
      { provide: AuthStore, useValue: { canAct: signal(canAct), isAdmin: signal(canAct) } },
    ],
  });
  const fixture = TestBed.createComponent(CasePage);
  fixture.componentRef.setInput('targetType', detail.target.type);
  fixture.componentRef.setInput('targetId', detail.target.id);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('the case of a collection', () => {
  const buttonNamed = (host: HTMLElement, name: string) =>
    [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === name);

  it('reads its title, its description and who may read it', async () => {
    const host = await render(caseOf('COLLECTION', []), false);

    expect(read).toHaveBeenCalledWith('COLLECTION', COLLECTION);
    expect(host.querySelector('h2')?.textContent).toBe('Cosy puzzles');
    expect(host.textContent).toContain('Short games for a rainy day.');
    expect([...host.querySelectorAll('header .nc-chip')].map((chip) => chip.textContent)).toEqual([
      'Collection',
      'Open',
      'Visible',
      'Unlisted',
    ]);
  });

  it('links each game it lists to the page of that game, in its order', async () => {
    const host = await render(caseOf('COLLECTION', []), false);

    const links = [...host.querySelectorAll('ol a')];
    expect(links.map((link) => link.textContent.trim())).toEqual(['Rain Room', 'Tea Tiles']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      `/moderation/games/${FIRST_GAME}`,
      `/moderation/games/${SECOND_GAME}`,
    ]);
  });

  it('says so when it lists no game', async () => {
    const host = await render(caseOf('COLLECTION', [], { games: [] }), false);

    expect(host.querySelector('ol')?.textContent.trim()).toBe('It lists no game');
  });

  it('links its owner to their account', async () => {
    const host = await render(caseOf('COLLECTION', []), false);

    expect(host.querySelector(`a[href="/moderation/users/${OWNER.id}"]`)).not.toBeNull();
  });

  it('draws no control that writes for a viewer', async () => {
    const host = await render(caseOf('COLLECTION', []), false);

    expect(host.querySelector('nc-operation-buttons')).toBeNull();
    expect(host.querySelectorAll('button:not(nc-short-id button)')).toHaveLength(0);
  });

  it('offers a moderator to hide it and no deletion', async () => {
    const host = await render(caseOf('COLLECTION', ['DISMISS', 'HIDE', 'WARN']), true);

    expect(buttonNamed(host, 'Hide the collection')).toBeDefined();
    expect(buttonNamed(host, 'Delete the collection')).toBeUndefined();
  });

  it('hides it through its own route once staff confirmed, then reads the case again', async () => {
    const host = await render(caseOf('COLLECTION', ['DISMISS', 'HIDE', 'DELETE']), true);

    buttonNamed(host, 'Hide the collection')?.click();
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));

    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'HIDE',
        targetType: 'COLLECTION',
        subject: 'Collection "Cosy puzzles"',
      }),
    );
    expect(decide).toHaveBeenCalledWith(
      { method: 'POST', path: `/admin/moderation/collections/${COLLECTION}/hide` },
      { reason: 'SPAM', resolveFlags: true },
    );
  });

  it('restores a hidden one and deletes it through the same root', async () => {
    const hidden = caseOf('COLLECTION', ['RESTORE', 'DELETE']);
    hidden.target.state = 'HIDDEN';
    const host = await render(hidden, true);

    buttonNamed(host, 'Restore the collection')?.click();
    await vi.waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
    buttonNamed(host, 'Delete the collection')?.click();
    await vi.waitFor(() => expect(decide).toHaveBeenCalledTimes(2));

    expect(decide.mock.calls.map(([request]) => request)).toEqual([
      { method: 'POST', path: `/admin/moderation/collections/${COLLECTION}/restore` },
      { method: 'DELETE', path: `/admin/moderation/collections/${COLLECTION}` },
    ]);
  });

  it('sends nothing when staff back out of the confirmation', async () => {
    const host = await render(caseOf('COLLECTION', ['HIDE']), true);
    ask.mockResolvedValue(null);

    buttonNamed(host, 'Hide the collection')?.click();
    await vi.waitFor(() => expect(ask).toHaveBeenCalled());

    expect(decide).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('draws neither a visibility nor a list of games for a target that has none', async () => {
    const host = await render(caseOf('COMMENT', [], { visibility: null, games: [] }), false);

    expect([...host.querySelectorAll('header .nc-chip')].map((chip) => chip.textContent)).toEqual([
      'Comment',
      'Open',
      'Visible',
    ]);
    expect(host.querySelector('ol')).toBeNull();
  });

  it('draws no list of games once the collection is gone', async () => {
    const gone = caseOf('COLLECTION', [], { current: null, visibility: null, games: [] });
    gone.target.state = 'GONE';
    const host = await render(gone, false);

    expect(host.querySelector('ol')).toBeNull();
    expect(host.textContent).toContain('It is gone.');
  });
});
