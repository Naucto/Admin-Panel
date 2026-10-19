import type { Routes } from '@angular/router';

import { signedInGuard, signedOutGuard } from './core/auth.guard';

export interface ShellRouteData {
  /** Shown in the top bar. */
  heading: string;
  /** Pages charting a period get the range and grain controls. */
  stats?: boolean;
}

const page = (heading: string, stats = false): { title: string; data: ShellRouteData } => ({
  title: `${heading} · Naucto Admin`,
  data: { heading, stats },
});

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [signedOutGuard],
    title: 'Sign in · Naucto Admin',
    loadComponent: () => import('./features/login/login.page'),
  },
  {
    path: '',
    canActivate: [signedInGuard],
    loadComponent: () => import('./features/shell/shell.component'),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () => import('./features/overview/overview.page'),
        ...page('Overview', true),
      },
      {
        path: 'audience',
        loadComponent: () => import('./features/audience/audience.page'),
        ...page('Audience', true),
      },
      {
        path: 'games',
        loadComponent: () => import('./features/games/games.page'),
        ...page('Games', true),
      },
      {
        path: 'creators',
        loadComponent: () => import('./features/creators/creators.page'),
        ...page('Creators', true),
      },
      {
        path: 'live',
        loadComponent: () => import('./features/live/live.page'),
        ...page('Live'),
      },
      {
        path: 'explorer',
        loadComponent: () => import('./features/explorer/explorer.page'),
        ...page('Metric explorer', true),
      },
      {
        path: 'feedback',
        loadComponent: () => import('./features/ratings/ratings.page'),
        ...page('Feedback', true),
      },
      {
        path: 'bugs',
        loadComponent: () => import('./features/bugs/bugs.page'),
        ...page('Bug reports'),
      },
      {
        path: 'bugs/:id',
        loadComponent: () => import('./features/bugs/bug-detail.page'),
        ...page('Bug report'),
      },
      {
        path: 'crashes',
        loadComponent: () => import('./features/crashes/crashes.page'),
        ...page('Crashes'),
      },
      {
        path: 'admins',
        loadComponent: () => import('./features/admins/admins.page'),
        ...page('Admins'),
      },
      {
        path: 'account',
        loadComponent: () => import('./features/account/account.page'),
        ...page('Account'),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
