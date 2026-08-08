import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // No hay token guardado
  if (!authService.getAccessToken()) {
    router.navigate(['/login']);
    return false;
  }

  // Si está caducado, intentar refrescar
  if (authService.checkJWTExpired()) {
    try {
      await firstValueFrom(authService.refresh());

      // Si después del refresh sigue sin haber token, logout
      if (!authService.getAccessToken()) {
        authService.logout();
        router.navigate(['/login']);
        return false;
      }

      return true;
    } catch {
      authService.logout();
      router.navigate(['/login']);
      return false;
    }
  }

  return true;
};
