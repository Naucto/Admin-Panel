import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './core/theme.service';
import { ActionDialogComponent } from './ui/action-dialog.component';
import { FeedbackComponent } from './ui/feedback.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ActionDialogComponent, FeedbackComponent],
  template: '<router-outlet /><nc-action-dialog /><nc-feedback />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Instantiated first so the theme attribute is on the page before any chart reads its colours.
  protected readonly theme = inject(ThemeService);
}
