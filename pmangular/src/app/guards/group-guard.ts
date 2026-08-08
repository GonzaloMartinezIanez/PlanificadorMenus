import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { GroupService } from '../services/group.service';
import { firstValueFrom } from 'rxjs';

export const groupGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state) => {
  const groupService = inject(GroupService);
  const router = inject(Router);

  const groupCode = route.paramMap.get('group_code');

  if (!groupCode) {
    router.navigate(['/groups/onboarding']);
    return false;
  }

  try {
    // Este endpoint solo responde 200 si perteneces al grupo
    await firstValueFrom(groupService.getGroupMembers(groupCode));
    return true;
  } catch {
    router.navigate(['/groups/onboarding']);
    return false;
  }
};
