import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { GroupService } from '../../../services/group.service';
import { GroupJoin } from './group-join';

describe('GroupJoin', () => {
  let component: GroupJoin;
  let fixture: ComponentFixture<GroupJoin>;
  const groupService = { joinGroup: vi.fn(), getMyGroups: vi.fn() };
  const authService = { isAuthenticated: vi.fn(), login: vi.fn() };
  const router = { navigate: vi.fn() };
  const route = { snapshot: { paramMap: { get: vi.fn() } } };
  const snackBar = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [GroupJoin],
      providers: [
        { provide: GroupService, useValue: groupService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

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
});
