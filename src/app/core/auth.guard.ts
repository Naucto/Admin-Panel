import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';
import { landingFor } from './nav';
import { type Area, canOpen } from './roles';

export const signedInGuard: CanActivateFn = (_route, state) => {
  return inject(AuthStore).status() === 'signed-in'
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { next: state.url } });
};

/** Sends a role away from an area it does not open, to where it starts. */
export const areaGuard =
  (area: Area): CanActivateFn =>
  () => {
    const role = inject(AuthStore).role();
    return canOpen(role, area) ? true : inject(Router).createUrlTree([landingFor(role)]);
  };

export const signedOutGuard: CanActivateFn = () => {
  return inject(AuthStore).status() === 'signed-in' ? inject(Router).createUrlTree(['/']) : true;
};
