import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { GroupService } from '../services/group.service';
import { groupGuard } from './group-guard';

describe('groupGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => groupGuard(...guardParameters));
  const router = { navigate: vi.fn() };
  const groupService = { getGroupMembers: vi.fn() };

  function routeWithGroupCode(groupCode: string | null) {
    return {
      paramMap: { get: vi.fn().mockReturnValue(groupCode) },
    } as unknown as ActivatedRouteSnapshot;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: GroupService, useValue: groupService },
      ],
    });
  });

  it('should send to onboarding if there is no group', async () => {
    await expect(executeGuard(routeWithGroupCode(null), {} as never)).resolves.toBe(false);

    expect(router.navigate).toHaveBeenCalledWith(['/group-onboarding']);
  });

  it('should let user navigate to one of his groups', async () => {
    groupService.getGroupMembers.mockReturnValue(of([]));

    await expect(executeGuard(routeWithGroupCode('ABC123'), {} as never)).resolves.toBe(true);

    expect(groupService.getGroupMembers).toHaveBeenCalledWith('ABC123');
  });

  it('should send to onboarding if there the user doesnt belong to the group', async () => {
    groupService.getGroupMembers.mockReturnValue(throwError(() => new Error('Prohibido')));

    await expect(executeGuard(routeWithGroupCode('ABC123'), {} as never)).resolves.toBe(false);

    expect(router.navigate).toHaveBeenCalledWith(['/group-onboarding']);
  });
});
