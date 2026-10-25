import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { GroupService } from '../../../services/group.service';
import { GoogleIdentityService } from '../../../services/google-identity.service';
import { GoogleLogin } from '../../../core/google-login/google-login';
import { GroupModel } from '../../../models/group';
import { GroupJoin } from './group-join';

describe('GroupJoin', () => {
  let component: GroupJoin;
  let fixture: ComponentFixture<GroupJoin>;
  const groupService = { joinGroup: vi.fn(), getMyGroups: vi.fn() };
  const authService = { isAuthenticated: vi.fn(), login: vi.fn() };
  const router = { navigate: vi.fn() };
  const route = { snapshot: { paramMap: { get: vi.fn() } } };
  const snackBar = { open: vi.fn() };
  const identity = { load: vi.fn(), renderButton: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    authService.isAuthenticated.mockReturnValue(false);
    route.snapshot.paramMap.get.mockReturnValue('ABC12345');
    groupService.getMyGroups.mockReturnValue(of([]));
    groupService.joinGroup.mockReturnValue(of({ message: 'Solicitud enviada' }));
    identity.load.mockResolvedValue(undefined);
    identity.renderButton.mockReturnValue(vi.fn());
    await TestBed.configureTestingModule({
      imports: [GroupJoin],
      providers: [
        { provide: GroupService, useValue: groupService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: GoogleIdentityService, useValue: identity },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();

    fixture = TestBed.createComponent(GroupJoin);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should requests to join when the user is authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);
    groupService.joinGroup.mockReturnValue(of({ message: 'Solicitud enviada' }));
    component.groupCode.set('ABC12345');

    component.joinGroup();

    expect(groupService.joinGroup).toHaveBeenCalledWith('ABC12345');
    expect(component.hasRequestedJoin()).toBe(true);
  });

  it('should redirects to the group when the request has been accepted', () => {
    component.groupCode.set('ABC12345');
    groupService.getMyGroups.mockReturnValue(of([{ group_code: 'ABC12345' }]));

    component.checkAccepted();

    expect(router.navigate).toHaveBeenCalledWith(['/home', 'ABC12345']);
  });

  it('requests the invited group after the shared Google component authenticates', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const button: GoogleLogin = fixture.debugElement.query(By.directive(GoogleLogin)).componentInstance;
    authService.isAuthenticated.mockReturnValue(true);
    button.authenticated.emit();
    expect(groupService.joinGroup).toHaveBeenCalledWith('ABC12345');
    expect(component.hasRequestedJoin()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('opens the invited group without sending another request if already a member', () => {
    component.groupCode.set('ABC12345');
    groupService.getMyGroups.mockReturnValue(of([{ group_code: 'ABC12345' }]));
    component.onAuthenticated();
    expect(router.navigate).toHaveBeenCalledWith(['/home', 'ABC12345']);
    expect(groupService.joinGroup).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
  });

  it('checks an existing session without rendering another sign-in button', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    groupService.getMyGroups.mockReturnValue(of([{ group_code: 'ABC12345' }]));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/home', 'ABC12345']);
    expect(fixture.debugElement.query(By.directive(GoogleLogin))).toBeNull();
  });

  it('reports authentication errors through the invitation screen', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const button: GoogleLogin = fixture.debugElement.query(By.directive(GoogleLogin)).componentInstance;
    button.loadingChange.emit(true);
    expect(component.isLoading()).toBe(true);
    button.loadingChange.emit(false);
    button.loginError.emit('No se pudo iniciar sesión.');
    expect(component.isLoading()).toBe(false);
    expect(snackBar.open).toHaveBeenCalledWith('No se pudo iniciar sesión.', 'Cerrar', expect.any(Object));
  });

  it('does not request a group when membership cannot be checked', () => {
    component.groupCode.set('ABC12345');
    groupService.getMyGroups.mockReturnValue(throwError(() => new Error('Unavailable')));
    component.onAuthenticated();
    expect(groupService.joinGroup).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
    expect(snackBar.open).toHaveBeenCalledWith(
      'No se pudo comprobar el grupo al que quieres unirte.',
      'Cerrar',
      expect.any(Object),
    );
  });

  it('does not process a late membership response after leaving the invitation', () => {
    const pending = new Subject<GroupModel[]>();
    component.groupCode.set('ABC12345');
    groupService.getMyGroups.mockReturnValue(pending);
    component.onAuthenticated();
    fixture.destroy();
    pending.next([]);
    expect(groupService.joinGroup).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
