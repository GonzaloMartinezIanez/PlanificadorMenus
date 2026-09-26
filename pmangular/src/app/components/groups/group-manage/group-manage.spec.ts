import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { GroupService } from '../../../services/group.service';
import { GroupManage } from './group-manage';

describe('GroupManage', () => {
  let component: GroupManage;
  let fixture: ComponentFixture<GroupManage>;
  const authService = { currentUserId: signal(1) };
  const groupService = {};
  const router = { navigate: vi.fn(), events: { pipe: vi.fn() } };
  const route = { root: { snapshot: { paramMap: { get: vi.fn() } } } };
  const snackBar = { open: vi.fn() };
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [GroupManage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: GroupService, useValue: groupService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupManage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should synchronize the form with the selected group and detect changes', () => {
    component.selectedGroupCode.set('ABC12345');
    component.myGroups.set([
      {
        group_code: 'ABC12345',
        group_name: 'Familia',
        group_description: 'Menús de casa',
        creation_date: '2026-01-01',
      },
    ]);

    component.syncGroupForm();

    expect(component.groupForm.value.group_name).toBe('Familia');
    expect(component.hasGroupChanges()).toBe(false);
    component.groupForm.patchValue({ group_name: 'Amigos' });
    expect(component.hasGroupChanges()).toBe(true);
  });

  it('should identify administrators and adapt member columns', () => {
    component.groupMembers.set([
      { user_id: 1, role: 'ADMIN', accepted: true },
      { user_id: 2, role: 'MEMBER', accepted: true },
      { user_id: 3, role: 'MEMBER', accepted: false },
    ] as never);

    expect(component.isAdmin()).toBe(true);
    expect(component.displayedAcceptedColumns()).toContain('actions');
    expect(component.acceptedMembers()).toHaveLength(2);
    expect(component.pendingMembers()).toHaveLength(1);
  });
});
