import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { areaGuard, signedInGuard, signedOutGuard } from './core/auth.guard';
import { AuthStore } from './core/auth.store';
import { landingFor } from './core/nav';
import type { Area } from './core/roles';

export interface ShellRouteData {
  /** Shown in the top bar. */
  heading: string;
  /** Pages charting a period get the range and grain controls. */
  stats?: boolean;
}

/** A page of one area of the console: a role that does not open the area is sent where it starts. */
const page = (
  heading: string,
  area: Area | null,
  stats = false,
): { title: string; data: ShellRouteData; canActivate: ReturnType<typeof areaGuard>[] } => ({
  title: `${heading} · Naucto Admin`,
  data: { heading, stats },
  canActivate: area ? [areaGuard(area)] : [],
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
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => landingFor(inject(AuthStore).role()),
      },
      {
        path: 'overview',
        loadComponent: () => import('./features/overview/overview.page'),
        ...page('Overview', 'stats', true),
      },
      {
        path: 'audience',
        loadComponent: () => import('./features/audience/audience.page'),
        ...page('Audience', 'stats', true),
      },
      {
        path: 'games',
        loadComponent: () => import('./features/games/games.page'),
        ...page('Games', 'stats', true),
      },
      {
        path: 'creators',
        loadComponent: () => import('./features/creators/creators.page'),
        ...page('Creators', 'stats', true),
      },
      {
        path: 'timeline',
        loadComponent: () => import('./features/timeline/timeline.page'),
        ...page('Timeline', 'stats'),
      },
      {
        path: 'posts',
        loadComponent: () => import('./features/posts/posts.page'),
        ...page('Posts and their impact', 'stats'),
      },
      {
        path: 'compare',
        loadComponent: () => import('./features/compare/compare.page'),
        ...page('Compare', 'stats'),
      },
      {
        path: 'live',
        loadComponent: () => import('./features/live/live.page'),
        ...page('Live', 'stats'),
      },
      {
        path: 'explorer',
        loadComponent: () => import('./features/explorer/explorer.page'),
        ...page('Metric explorer', 'stats', true),
      },
      {
        path: 'feedback',
        loadComponent: () => import('./features/ratings/ratings.page'),
        ...page('Feedback', 'support', true),
      },
      {
        path: 'bugs',
        loadComponent: () => import('./features/bugs/bugs.page'),
        ...page('Bug reports', 'support'),
      },
      {
        path: 'bugs/:id',
        loadComponent: () => import('./features/bugs/bug-detail.page'),
        ...page('Bug report', 'support'),
      },
      {
        path: 'crashes',
        loadComponent: () => import('./features/crashes/crashes.page'),
        ...page('Crashes', 'support'),
      },
      {
        path: 'admins',
        loadComponent: () => import('./features/admins/admins.page'),
        ...page('Admins', 'administration'),
      },
      {
        path: 'account',
        loadComponent: () => import('./features/account/account.page'),
        ...page('Account', null),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
