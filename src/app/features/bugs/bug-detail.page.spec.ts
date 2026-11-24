import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../core/auth.store';
import type { BugDetail } from '../../core/types';
import { UserFeedbackApi } from '../../core/user-feedback.api';
import BugDetailPage from './bug-detail.page';

const BUG = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

function bugOf(changes: Partial<BugDetail> = {}): BugDetail {
  return {
    id: BUG,
    title: 'The map does not scroll',
    category: 'EDITOR',
    status: 'NEW',
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    account: {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      username: 'mira',
      nickname: null,
      email: null,
      role: 'User',
      createdAt: '2026-11-01T10:00:00.000Z',
      profileUrl: null,
      deleted: false,
    },
    release: null,
    hasScreenshot: true,
    description: 'Dragging the map does nothing.',
    route: '/edit',
    projectId: null,
    context: {},
    adminNote: null,
    rating: null,
    screenshot: { mime: 'image/png', bytes: 2048 },
    ...changes,
  };
}

describe('the page of a bug report', () => {
  const screenshot = vi.fn<UserFeedbackApi['screenshot']>();
  const createObjectURL = vi.fn<(blob: Blob) => string>();
  const revokeObjectURL = vi.fn<(url: string) => void>();

  beforeEach(() => {
    screenshot.mockReset().mockResolvedValue(new Blob(['shot'], { type: 'image/png' }));
    createObjectURL.mockReset().mockImplementation((blob) => `blob:${blob.type}`);
    revokeObjectURL.mockReset();
    // jsdom has neither.
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });

  async function render(bug: BugDetail): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserFeedbackApi, useValue: { bug: () => Promise.resolve(bug), screenshot } },
        { provide: AuthStore, useValue: { isAdmin: signal(false) } },
      ],
    });
    const fixture = TestBed.createComponent(BugDetailPage);
    fixture.componentRef.setInput('id', bug.id);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the screenshot from the bytes the bearer fetched, and lets them go on leaving', async () => {
    const host = await render(bugOf());

    expect(screenshot).toHaveBeenCalledWith(BUG);
    expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:image/png');

    TestBed.resetTestingModule();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image/png');
  });

  it('asks for no screenshot for a report that carried none', async () => {
    const host = await render(bugOf({ hasScreenshot: false, screenshot: null }));

    expect(screenshot).not.toHaveBeenCalled();
    expect(host.textContent).toContain('No screenshot');
  });

  it('says why when the screenshot cannot be read', async () => {
    screenshot.mockRejectedValue(new Error('The screenshot is not there'));
    const host = await render(bugOf());

    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('The screenshot is not there');
  });
});
