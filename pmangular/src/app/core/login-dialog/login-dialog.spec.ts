import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { GoogleLogin } from '../google-login/google-login';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { LoginDialog } from './login-dialog';

@Component({ template: '' })
class CalendarDestination {}

describe('LoginDialog', () => {
  let fixture: ComponentFixture<LoginDialog>;
  const groupService = { getInitialRoute: vi.fn() };
  const dialogRef = { close: vi.fn() };
  const identity = { load: vi.fn(), renderButton: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    groupService.getInitialRoute.mockReturnValue(of(['/home', 'GROUP001']));
    identity.load.mockResolvedValue(undefined);
    identity.renderButton.mockReturnValue(vi.fn());
    await TestBed.configureTestingModule({
      imports: [LoginDialog],
      providers: [
        provideRouter([{ path: 'home/:group_code', component: CalendarDestination }]),
        { provide: GroupService, useValue: groupService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: GoogleIdentityService, useValue: identity },
        { provide: AuthService, useValue: { login: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginDialog);
  });

  it('opens the initial route after the Google control authenticates the user', async () => {
    fixture.detectChanges();
    fixture.debugElement.query(By.directive(GoogleLogin)).componentInstance.authenticated.emit();
    await fixture.whenStable();

    expect(dialogRef.close).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).url).toBe('/home/GROUP001');
  });
});
