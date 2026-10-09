import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The Naucto mark, copied from the Naucto UI kit; inline so it takes the theme's gold. */
@Component({
  selector: 'ad-logo',
  templateUrl: './logo.component.svg',
  host: { class: 'inline-flex shrink-0 items-center justify-center leading-none text-gold-ink' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  readonly size = input(32);
}
