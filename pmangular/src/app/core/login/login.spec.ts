import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, vi } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { GoogleLogin } from '../google-login/google-login';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  const auth = { isAuthenticated: signal(false) };
  const groups = { getInitialRoute: vi.fn() };
  const router = { navigate: vi.fn() };
  const identity = { load: vi.fn(), renderButton: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    localStorage.clear();
    auth.isAuthenticated.set(false);
    groups.getInitialRoute.mockReturnValue(of(['/group-onboarding']));
    identity.load.mockResolvedValue(undefined);
    identity.renderButton.mockReturnValue(vi.fn());
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: GroupService, useValue: groups },
        { provide: Router, useValue: router },
        { provide: GoogleIdentityService, useValue: identity },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.clear());

  it('opens the saved group after the shared button authenticates', async () => {
    groups.getInitialRoute.mockReturnValue(of(['/home', 'SAVED']));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.debugElement.query(By.directive(GoogleLogin)).componentInstance.authenticated.emit();
    expect(router.navigate).toHaveBeenCalledWith(['/home', 'SAVED']);
  });

  it('opens onboarding when the user has no groups', () => {
    component.onAuthenticated();
    expect(router.navigate).toHaveBeenCalledWith(['/group-onboarding']);
  });

  it('redirects an existing session without rendering the Google button', async () => {
    auth.isAuthenticated.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/group-onboarding']);
    expect(fixture.debugElement.query(By.directive(GoogleLogin))).toBeNull();
    expect(identity.load).not.toHaveBeenCalled();
  });

  it('shows shared login errors and clears them on the next attempt', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const child: GoogleLogin = fixture.debugElement.query(By.directive(GoogleLogin)).componentInstance;
    child.loginError.emit('Error de acceso');
    expect(component.errorMessage()).toBe('Error de acceso');
    child.loadingChange.emit(true);
    expect(component.errorMessage()).toBe('');
    expect(component.isLoading()).toBe(true);
  });

  it('reports a group loading failure without navigating', () => {
    groups.getInitialRoute.mockReturnValue(throwError(() => new Error('Unavailable')));
    component.onAuthenticated();
    expect(component.errorMessage()).toBe('No se pudieron cargar los grupos del usuario.');
    expect(component.isLoading()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when a group response arrives after leaving the screen', () => {
    const pending = new Subject<string[]>();
    groups.getInitialRoute.mockReturnValue(pending);
    component.onAuthenticated();
    fixture.destroy();
    pending.next([]);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
