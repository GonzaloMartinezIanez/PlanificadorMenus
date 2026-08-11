import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  // Hay que comprobar que no son estas peticiones porque de lo contrario
  // entra en un bucle infinito ya que la petición de refresh vuelve a entrar
  // en el interceptor
  const isLoginRequest = req.url === `${environment.apiUrl}/auth/`;
  const isRefreshRequest = req.url === `${environment.apiUrl}/auth/refresh/`;
  const isLogoutRequest = req.url === `${environment.apiUrl}/auth/logout/`;

  if (isLoginRequest || isRefreshRequest) {
    return next(req);
  }

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

  if (isLogoutRequest) {
    return next(req);
  }

  return next(req);
}
