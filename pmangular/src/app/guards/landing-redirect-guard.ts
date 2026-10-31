import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { GroupService } from '../services/group.service';

export const landingRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const groupService = inject(GroupService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) return true;

  return groupService.getInitialRoute().pipe(
    map((commands) => router.createUrlTree(commands)),
    // Si no se puede recuperar la sesión, se muestra la landing para permitir iniciar sesión de nuevo.
    catchError(() => of(true)),
  );
};
