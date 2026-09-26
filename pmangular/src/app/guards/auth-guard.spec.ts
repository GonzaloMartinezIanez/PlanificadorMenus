import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const router = { navigate: vi.fn() };
  const authService = {
    getAccessToken: vi.fn(),
    checkJWTExpired: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    clearSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('should send to login if not token provided', async () => {
    authService.getAccessToken.mockReturnValue(null);

    await expect(executeGuard({} as never, {} as never)).resolves.toBe(false);

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should let navigate with a valid token', async () => {
    authService.getAccessToken.mockReturnValue('token');
    authService.checkJWTExpired.mockReturnValue(false);

    await expect(executeGuard({} as never, {} as never)).resolves.toBe(true);

    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('should refresh the token if expired', async () => {
    authService.getAccessToken.mockReturnValue('token');
    authService.checkJWTExpired.mockReturnValue(true);
    authService.refresh.mockReturnValue(of({}));

    await expect(executeGuard({} as never, {} as never)).resolves.toBe(true);

    expect(authService.refresh).toHaveBeenCalled();
  });

  it('should logout if it cant refresh the token', async () => {
    authService.getAccessToken.mockReturnValue('token');
    authService.checkJWTExpired.mockReturnValue(true);
    authService.refresh.mockReturnValue(throwError(() => new Error('No autorizado')));

    await expect(executeGuard({} as never, {} as never)).resolves.toBe(false);

    expect(authService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
