import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { GroupService } from '../../../services/group.service';
import { GroupOnboarding } from './group-onboarding';

describe('GroupOnboarding', () => {
  let component: GroupOnboarding;
  let fixture: ComponentFixture<GroupOnboarding>;
  const router = { navigate: vi.fn() };
  const groupService = { getMyGroups: vi.fn() };
  const authService = { logout: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [GroupOnboarding],
      providers: [
        { provide: Router, useValue: router },
        { provide: GroupService, useValue: groupService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupOnboarding);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirects to the first available group', () => {
    groupService.getMyGroups.mockReturnValue(of([{ group_code: 'ABC12345' }]));

    component.checkAccepted();

    expect(router.navigate).toHaveBeenCalledWith(['/home/ABC12345']);
  });

  it('should logs out and returns to login', () => {
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
