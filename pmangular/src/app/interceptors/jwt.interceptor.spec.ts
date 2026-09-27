import { HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => TestBed.runInInjectionContext(() => jwtInterceptor(req, next));
  const authService = {
    getAccessToken: vi.fn(),
    checkJWTExpired: vi.fn(),
    refresh: vi.fn(),
    clearSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
  });

  it('should not add headers to login', () => {
    authService.getAccessToken.mockReturnValue('token');
    const next = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    interceptor(new HttpRequest('POST', `${environment.apiUrl}/auth/`, {}), next).subscribe();

    expect(next.mock.calls[0][0].headers.has('Authorization')).toBe(false);
  });

  it('should add token in the header', () => {
    authService.getAccessToken.mockReturnValue('token');
    authService.checkJWTExpired.mockReturnValue(false);
    const next = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    interceptor(new HttpRequest('GET', `${environment.apiUrl}/recipes/`), next).subscribe();

    expect(next.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer token');
  });

  it('should refresh the token if it expires', () => {
    authService.getAccessToken.mockReturnValueOnce('old-token').mockReturnValue('new-token');
    authService.checkJWTExpired.mockReturnValue(true);
    authService.refresh.mockReturnValue(of({}));
    const next = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    interceptor(new HttpRequest('GET', `${environment.apiUrl}/recipes/`), next).subscribe();

    expect(authService.refresh).toHaveBeenCalled();
    expect(next.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer new-token');
  });

  it('should continue with the petition on a public endpoint', () => {
    authService.getAccessToken.mockReturnValue('expired-token');
    authService.checkJWTExpired.mockReturnValue(true);
    authService.refresh.mockReturnValue(throwError(() => new Error('No autorizado')));
    const next = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    interceptor(new HttpRequest('GET', `${environment.apiUrl}/recipes/17/`), next).subscribe();

    expect(authService.clearSession).toHaveBeenCalled();
    expect(next.mock.calls[0][0].headers.has('Authorization')).toBe(false);
  });
});
