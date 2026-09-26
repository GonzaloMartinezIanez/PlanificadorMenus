import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { GroupService } from '../../../services/group.service';
import { GroupForms } from './group-forms';

describe('GroupForms', () => {
  let component: GroupForms;
  let fixture: ComponentFixture<GroupForms>;
  const router = { navigate: vi.fn() };
  const groupService = {
    createGroup: vi.fn(),
    joinGroup: vi.fn(),
    getMyGroups: vi.fn(),
  };
  const authService = { logout: vi.fn() };
  const snackBar = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [GroupForms],
      providers: [
        { provide: Router, useValue: router },
        { provide: GroupService, useValue: groupService },
        { provide: AuthService, useValue: authService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupForms);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not call the API when the create group form is invalid', () => {
    component.createGroup();

    expect(groupService.createGroup).not.toHaveBeenCalled();
  });

  it('should create a valid group and navigate to its calendar', () => {
    groupService.createGroup.mockReturnValue(of({ group_code: 'ABC12345' }));
    component.newGroupForm.setValue({ group_name: 'Familia', group_description: 'Casa' });

    component.createGroup();

    expect(groupService.createGroup).toHaveBeenCalledWith(component.newGroupForm.value);
    expect(router.navigate).toHaveBeenCalledWith(['/home/ABC12345']);
  });

  it('should redirects to the group whose request was accepted', () => {
    component.requestedGroupCode.set('SECOND01');
    groupService.getMyGroups.mockReturnValue(
      of([
        { group_code: 'FIRST001', group_name: 'Primero' },
        { group_code: 'SECOND01', group_name: 'Segundo' },
      ]),
    );

    component.checkAccepted();

    expect(router.navigate).toHaveBeenCalledWith(['/home/SECOND01']);
  });
});
