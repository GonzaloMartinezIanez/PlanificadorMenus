import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { GroupService } from '../../../services/group.service';
import { environment } from '../../../../environments/environment';
import { AuthUser } from '../../../models/auth-user';
import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
  const authService = {
    currentUser: signal<AuthUser>({ id: 1, username: 'Gonzalo', profile_picture: null }),
    isAuthenticated: vi.fn(),
    logout: vi.fn(),
  };
  const groupService = { getMyGroups: vi.fn() };
  const router = { navigate: vi.fn(), navigateByUrl: vi.fn(), url: '/home/OLD12345', events: EMPTY };
  const route = { root: { snapshot: { paramMap: { get: vi.fn() } } } };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: GroupService, useValue: groupService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate the user initial and change the group in the current route', () => {
    component.selectedGroupCode.set('OLD12345');

    component.changeGroup('NEW12345');

    expect(component.userInitialLetter()).toBe('G');
    expect(component.selectedGroupCode()).toBe('NEW12345');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home/NEW12345');
  });

  it('should use the first group when the stored group no longer exists', () => {
    component.selectedGroupCode.set('INVALID');
    authService.isAuthenticated.mockReturnValue(true);
    groupService.getMyGroups.mockReturnValue({
      subscribe: ({ next }: { next: (groups: { group_code: string }[]) => void }) =>
        next([{ group_code: 'GROUP001' }]),
    });

    component.loadMyGroups();

    expect(component.selectedGroupCode()).toBe('GROUP001');
    expect(localStorage.getItem(environment.ACTIVE_GROUP_KEY)).toBe('GROUP001');
  });

  it('should show the fallback avatar after an image loading error', () => {
    authService.currentUser.set({
      id: 1,
      username: 'Gonzalo',
      profile_picture: 'https://example.com/avatar.jpg',
    });

    expect(component.showAvatar()).toBe(true);

    component.onAvatarError();

    expect(component.showAvatar()).toBe(false);
  });

  it('should log out and return to the root route', () => {
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['']);
  });
});
