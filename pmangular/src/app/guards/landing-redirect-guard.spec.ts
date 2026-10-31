import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { GroupService } from '../services/group.service';
import { landingRedirectGuard } from './landing-redirect-guard';

describe('landingRedirectGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => landingRedirectGuard(...guardParameters));
  const authService = { isAuthenticated: vi.fn() };
  const groupService = { getInitialRoute: vi.fn() };
  const router = { createUrlTree: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: GroupService, useValue: groupService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('shows the landing page without loading groups for visitors', () => {
    authService.isAuthenticated.mockReturnValue(false);

    expect(executeGuard({} as never, {} as never)).toBe(true);
    expect(groupService.getInitialRoute).not.toHaveBeenCalled();
  });

  it('redirects an existing session before activating the landing page', async () => {
    const destination = {} as UrlTree;
    authService.isAuthenticated.mockReturnValue(true);
    groupService.getInitialRoute.mockReturnValue(of(['/home', 'GROUP001']));
    router.createUrlTree.mockReturnValue(destination);

    const result = await firstValueFrom(executeGuard({} as never, {} as never) as Observable<boolean | UrlTree>);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/home', 'GROUP001']);
    expect(result).toBe(destination);
  });

  it('allows the landing page to recover from an unavailable group request', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    groupService.getInitialRoute.mockReturnValue(throwError(() => new Error('No disponible')));

    const result = await firstValueFrom(executeGuard({} as never, {} as never) as Observable<boolean | UrlTree>);

    expect(result).toBe(true);
  });
});
