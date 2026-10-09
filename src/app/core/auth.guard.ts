import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';

export const signedInGuard: CanActivateFn = (_route, state) => {
  return inject(AuthStore).status() === 'signed-in'
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { next: state.url } });
};

export const signedOutGuard: CanActivateFn = () => {
  return inject(AuthStore).status() === 'signed-in' ? inject(Router).createUrlTree(['/']) : true;
};
