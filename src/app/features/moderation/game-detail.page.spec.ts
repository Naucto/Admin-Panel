import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../core/auth.store';
import { ModerationApi } from '../../core/moderation.api';
import type { ModerationProjectDetail } from '../../core/types';
import GameDetailPage from './game-detail.page';

const GAME = '3f2b8c1e-9d4a-4e6f-8a7b-1c2d3e4f5a6b';
const EDITOR = `https://naucto.net/edit/${GAME}`;

function gameOf(changes: Partial<ModerationProjectDetail> = {}): ModerationProjectDetail {
  return {
    id: GAME,
    name: 'Rain Room',
    shortDesc: 'A room, and rain.',
    owner: {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      username: 'mira',
      nickname: null,
      role: 'User',
      deleted: false,
      profileUrl: null,
      email: null,
    },
    state: 'UNPUBLISHED',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    publishedAt: null,
    hiddenAt: null,
    openFlags: 0,
    playUrl: null,
    editUrl: EDITOR,
    longDesc: null,
    tags: [],
    collaborators: [],
    forkedFromId: null,
    hasCover: false,
    allowedActions: [],
    ...changes,
  };
}

describe('the page of a game', () => {
  const projectCover = vi.fn<ModerationApi['projectCover']>();
  const createObjectURL = vi.fn<(blob: Blob) => string>();
  const revokeObjectURL = vi.fn<(url: string) => void>();

  beforeEach(() => {
    projectCover.mockReset().mockResolvedValue(new Blob(['cover'], { type: 'image/png' }));
    createObjectURL.mockReset().mockImplementation((blob) => `blob:${blob.type}`);
    revokeObjectURL.mockReset();
    // jsdom has neither.
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });

  async function render(game: ModerationProjectDetail, canAct: boolean): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ModerationApi,
          useValue: {
            project: () => Promise.resolve(game),
            projectCover,
            log: () => Promise.resolve({ items: [], total: 0, page: 1, limit: 10 }),
          },
        },
        { provide: AuthStore, useValue: { canAct: signal(canAct), isAdmin: signal(canAct) } },
      ],
    });
    const fixture = TestBed.createComponent(GameDetailPage);
    fixture.componentRef.setInput('id', game.id);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const siteLinks = (host: HTMLElement) =>
    [...host.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')].map((link) => ({
      name: link.textContent.trim(),
      href: link.getAttribute('href'),
    }));

  it('opens the game in the editor through its one staff address', async () => {
    const host = await render(gameOf(), true);

    expect(siteLinks(host)).toEqual([{ name: 'Open in the editor', href: EDITOR }]);
  });

  it('keeps the way to the play page of a published game beside it', async () => {
    const play = `https://naucto.net/play/${GAME}`;
    const host = await render(gameOf({ state: 'PUBLISHED', playUrl: play }), true);

    expect(siteLinks(host)).toEqual([
      { name: 'Open on Naucto', href: play },
      { name: 'Open in the editor', href: EDITOR },
    ]);
  });

  it('draws no way into the editor for a viewer, whom the site would refuse', async () => {
    const host = await render(gameOf(), false);

    expect(siteLinks(host)).toEqual([]);
  });

  it('shows the cover from the bytes the bearer fetched, and lets them go on leaving', async () => {
    const host = await render(gameOf({ hasCover: true }), false);

    expect(projectCover).toHaveBeenCalledWith(GAME);
    expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:image/png');

    TestBed.resetTestingModule();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image/png');
  });

  it('says why when the cover cannot be read', async () => {
    projectCover.mockRejectedValue(new Error('The cover is not there'));
    const host = await render(gameOf({ hasCover: true }), false);

    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('The cover is not there');
  });
});
