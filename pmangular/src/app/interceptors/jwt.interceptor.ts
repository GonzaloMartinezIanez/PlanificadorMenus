import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (!authService.getAccessToken())
    return next(req);

  if (authService.checkJWTExpired()) {
    return authService.refresh().pipe(
      switchMap(() => {
        // Añadir el nuevo token recien creado a la cabecera
        const newReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${authService.getAccessToken()}`,
          }
        })

        return next(newReq);
      })
    )
  }

  // Añadir el token a la cabecera
  req = req.clone({
    setHeaders: {
      Authorization: `Bearer ${authService.getAccessToken()}`,
    },
  });

  return next(req);
}
