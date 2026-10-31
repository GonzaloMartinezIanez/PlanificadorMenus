import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { GoogleLogin } from '../google-login/google-login';
import { AuthService } from '../../services/auth.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { GroupService } from '../../services/group.service';
import { Landing } from './landing';

@Component({ template: '' })
class CalendarDestination {}

describe('Landing', () => {
  let fixture: ComponentFixture<Landing>;
  const auth = { isAuthenticated: signal(false) };
  const groupService = { getInitialRoute: vi.fn() };
  const identity = { load: vi.fn(), renderButton: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    auth.isAuthenticated.set(false);
    identity.load.mockResolvedValue(undefined);
    identity.renderButton.mockReturnValue(vi.fn());
    groupService.getInitialRoute.mockReturnValue(of(['/home', 'GROUP001']));
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([{ path: 'home/:group_code', component: CalendarDestination }]),
        { provide: AuthService, useValue: auth },
        { provide: GroupService, useValue: groupService },
        { provide: GoogleIdentityService, useValue: identity },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
  });

  it('offers Google sign-in and access to public recipes from the root page', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(fixture.debugElement.query(By.directive(GoogleLogin))).not.toBeNull();
    expect(element.querySelector<HTMLAnchorElement>('[routerLink="/recipes"]')).toBeTruthy();
  });

  it('opens the user initial route after Google authentication', async () => {
    fixture.detectChanges();
    fixture.debugElement.query(By.directive(GoogleLogin)).componentInstance.authenticated.emit();
    await fixture.whenStable();

    expect(groupService.getInitialRoute).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/home/GROUP001');
  });
});
