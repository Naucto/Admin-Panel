import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './core/theme.service';
import { FeedbackComponent } from './ui/feedback.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FeedbackComponent],
  template: '<router-outlet /><nc-feedback />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Instantiated first so the theme attribute is on the page before any chart reads its colours.
  protected readonly theme = inject(ThemeService);
}
