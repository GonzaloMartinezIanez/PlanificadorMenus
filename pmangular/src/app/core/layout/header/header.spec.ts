import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { GroupService } from '../../../services/group.service';
import { environment } from '../../../../environments/environment';
import { AuthUser } from '../../../models/auth-user';
import { GroupModel } from '../../../models/group';
import { Header } from './header';

@Component({ template: '' })
class TestPage {}

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
  let router: Router;
  const authService = {
    currentUser: signal<AuthUser>({ id: 1, username: 'Gonzalo', profile_picture: null }),
    isAuthenticated: signal(true),
    logout: vi.fn(),
  };
  const groupService = { getMyGroups: vi.fn() };
  const groups: GroupModel[] = [
    { group_code: 'OLD12345', group_name: 'Nuestra casa', group_description: '', creation_date: '2026-10-01' },
    { group_code: 'NEW12345', group_name: 'Amigos', group_description: '', creation_date: '2026-10-01' },
  ];

  beforeEach(async () => {
    vi.resetAllMocks();
    localStorage.clear();
    authService.isAuthenticated.set(true);
    authService.currentUser.set({ id: 1, username: 'Gonzalo', profile_picture: null });
    groupService.getMyGroups.mockReturnValue(of(groups));
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([
          { path: 'home/:group_code', component: TestPage },
          { path: 'list/:group_code', component: TestPage },
          { path: 'groups/:group_code/manage', component: TestPage },
          { path: 'groups/access', component: TestPage },
          { path: 'recipes', component: TestPage },
          { path: 'recipes/:id', component: TestPage },
          { path: 'group-onboarding', component: TestPage },
          { path: 'login', component: TestPage },
          { path: '', component: TestPage },
        ]),
        { provide: AuthService, useValue: authService },
        { provide: GroupService, useValue: groupService },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    await router.navigateByUrl('/home/OLD12345');
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.clear());

  async function renderHeader() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('shows the current group and marks the calendar link as the active page', async () => {
    await renderHeader();
    const active = fixture.nativeElement.querySelector('.desktop-nav a[aria-current="page"]');
    expect(active.textContent).toContain('Calendario');
    expect(fixture.nativeElement.querySelector('.group-select')).not.toBeNull();
    expect(component.selectedGroup()?.group_name).toBe('Nuestra casa');
    expect(component.userInitialLetter()).toBe('G');
  });

  it('keeps the current section, query parameters and fragment when switching groups', async () => {
    await router.navigateByUrl('/list/OLD12345?view=pending#items');
    await renderHeader();
    component.changeGroup('NEW12345');
    await fixture.whenStable();
    expect(router.url).toBe('/list/NEW12345?view=pending#items');
    expect(localStorage.getItem(environment.ACTIVE_GROUP_KEY)).toBe('NEW12345');
  });

  it('uses the first group if the stored group no longer exists', () => {
    component.selectedGroupCode.set('INVALID');
    component.loadMyGroups();
    expect(component.selectedGroupCode()).toBe('OLD12345');
    expect(localStorage.getItem(environment.ACTIVE_GROUP_KEY)).toBe('OLD12345');
  });

  it('keeps a single group visible without showing an unnecessary selector', async () => {
    groupService.getMyGroups.mockReturnValue(of([groups[0]]));
    await renderHeader();
    expect(fixture.nativeElement.querySelector('.group-select')).toBeNull();
    expect(fixture.nativeElement.querySelector('.group-context-name').textContent).toBe('Nuestra casa');
  });

  it('marks recipes active for a recipe detail and hides the unrelated group control', async () => {
    await router.navigateByUrl('/recipes/1');
    await renderHeader();
    const active = fixture.nativeElement.querySelector('.desktop-nav a[aria-current="page"]');
    expect(active.textContent).toContain('Recetas');
    expect(fixture.nativeElement.querySelector('.group-context')).toBeNull();
  });

  it('renders public navigation without requesting private groups', async () => {
    authService.isAuthenticated.set(false);
    await renderHeader();
    expect(groupService.getMyGroups).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.desktop-nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('.header-actions a').getAttribute('href')).toBe('/login');
    expect(fixture.nativeElement.querySelector('.brand').getAttribute('href')).toBe('/recipes');
  });

  it('provides valid destinations when the user has no groups', async () => {
    localStorage.setItem(environment.ACTIVE_GROUP_KEY, 'REMOVED');
    component.selectedGroupCode.set('REMOVED');
    groupService.getMyGroups.mockReturnValue(of([]));
    await router.navigateByUrl('/groups/access');
    await renderHeader();
    expect(component.homeLink()).toEqual(['/groups/access']);
    expect(localStorage.getItem(environment.ACTIVE_GROUP_KEY)).toBeNull();
    expect(fixture.nativeElement.querySelector('.desktop-nav a').getAttribute('href')).toBe('/group-onboarding');
  });

  it('uses the fallback avatar if the profile image fails', async () => {
    authService.currentUser.set({ id: 1, username: 'Gonzalo', profile_picture: 'https://example.com/avatar.jpg' });
    await renderHeader();
    fixture.nativeElement.querySelector('.avatar-image').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(component.showAvatar()).toBe(false);
    expect(fixture.nativeElement.querySelector('.avatar-fallback').textContent.trim()).toBe('G');
  });

  it('ignores a group response after the header is destroyed', () => {
    const pending = new Subject<GroupModel[]>();
    groupService.getMyGroups.mockReturnValue(pending);
    component.loadMyGroups();
    fixture.destroy();
    pending.next(groups);
    expect(component.myGroups()).toEqual([]);
  });

  it('logs out and returns to the root route', async () => {
    const navigate = vi.spyOn(router, 'navigate');
    component.logout();
    expect(authService.logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['']);
    await fixture.whenStable();
  });
});
