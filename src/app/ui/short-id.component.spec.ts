import { TestBed } from '@angular/core/testing';

import { FeedbackService } from './feedback.service';
import { ShortIdComponent } from './short-id.component';

const ID = '3f2b8c1e-9d4a-4e6f-8a7b-1c2d3e4f5a6b';

async function render(plain: boolean): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(ShortIdComponent);
  fixture.componentRef.setInput('id', ID);
  fixture.componentRef.setInput('plain', plain);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('a short id', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>();

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the first eight characters and names the whole id', async () => {
    const button = (await render(false)).querySelector('button');

    expect(button?.textContent.trim()).toBe('3f2b8c1e');
    expect(button?.getAttribute('aria-label')).toBe(`Copy the id ${ID}`);
    expect(button?.title).toBe(`Copy the id ${ID}`);
  });

  it('copies the whole id on a click, without opening the row it sits in', async () => {
    const host = await render(false);
    const rowClick = vi.fn();
    host.addEventListener('click', rowClick);

    host.querySelector('button')?.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(ID);
    expect(rowClick).not.toHaveBeenCalled();
    expect(TestBed.inject(FeedbackService).toasts()[0]?.text).toBe('Id copied');
  });

  it('says so when the browser refuses the copy', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const host = await render(false);

    host.querySelector('button')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(TestBed.inject(FeedbackService).toasts()[0]?.tone).toBe('error');
  });

  it('is no control inside a link or a button, and is still read whole', async () => {
    const host = await render(true);

    expect(host.querySelector('button')).toBeNull();
    expect(host.querySelector('[aria-hidden="true"]')?.textContent).toBe('3f2b8c1e');
    expect(host.querySelector('.sr-only')?.textContent).toBe(ID);
  });
});
