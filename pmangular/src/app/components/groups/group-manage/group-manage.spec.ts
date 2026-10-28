import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { GroupService } from '../../../services/group.service';
import { GroupManage } from './group-manage';
import { GroupMember } from '../../../models/group';
import { RealtimeService } from '../../../services/realtime.service';
import { RealtimeEvent } from '../../../models/realtime';

describe('GroupManage', () => {
  let component: GroupManage;
  let fixture: ComponentFixture<GroupManage>;
  const authService = { currentUserId: signal(1), isAuthenticated: signal(true) };
  const groupService = { getMyGroups: vi.fn(), getGroupMembers: vi.fn() };
  const router = { navigate: vi.fn(), events: new Subject<NavigationEnd>() };
  const route = { root: { snapshot: { paramMap: { get: vi.fn() } } } };
  const snackBar = { open: vi.fn() };
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    authService.isAuthenticated.set(true);
    router.events = new Subject<NavigationEnd>();
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
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();

    fixture = TestBed.createComponent(GroupManage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps unsaved group fields when a remote update arrives', () => {
    const events = new Subject<RealtimeEvent>();
    vi.spyOn(TestBed.inject(RealtimeService), 'watchGroup').mockReturnValue(events);
    route.root.snapshot.paramMap.get.mockReturnValue('ABC12345');
    groupService.getGroupMembers.mockReturnValue(of([]));
    groupService.getMyGroups.mockReturnValue(
      of([{ group_code: 'ABC12345', group_name: 'Original', group_description: '' }]),
    );
    vi.spyOn(component, 'loadQRCode').mockImplementation(() => {});
    component.ngOnInit();
    component.groupForm.controls['group_name'].setValue('Mi edición');
    component.groupForm.markAsDirty();
    groupService.getMyGroups.mockReturnValue(
      of([{ group_code: 'ABC12345', group_name: 'Actualización externa', group_description: '' }]),
    );
    events.next({ type: 'group.updated', group_code: 'ABC12345' });
    expect(component.myGroups()[0].group_name).toBe('Actualización externa');
    expect(component.groupForm.controls['group_name'].value).toBe('Mi edición');
  });

  it('stops route listeners and pending member requests when leaving group management', () => {
    const pending = new Subject<GroupMember[]>();
    groupService.getMyGroups.mockReturnValue(of([]));
    groupService.getGroupMembers.mockReturnValue(pending);
    route.root.snapshot.paramMap.get.mockReturnValue('ABC12345');
    vi.spyOn(component, 'loadQRCode').mockImplementation(() => {});
    component.ngOnInit();
    expect(groupService.getGroupMembers).toHaveBeenCalledTimes(1);
    expect(pending.observed).toBe(true);
    fixture.destroy();
    expect(pending.observed).toBe(false);
    router.events.next(new NavigationEnd(1, '/login', '/login'));
    expect(groupService.getGroupMembers).toHaveBeenCalledTimes(1);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('does not request members without a session or show an error after signing out', () => {
    component.selectedGroupCode.set('ABC12345');
    const pending = new Subject<GroupMember[]>();
    groupService.getGroupMembers.mockReturnValue(pending);
    component.loadGroupMembers();
    authService.isAuthenticated.set(false);
    pending.error({ error: {} });
    component.loadGroupMembers();
    expect(groupService.getGroupMembers).toHaveBeenCalledTimes(1);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('still reports genuine member loading errors while signed in', () => {
    component.selectedGroupCode.set('ABC12345');
    groupService.getGroupMembers.mockReturnValue(throwError(() => ({ error: {} })));
    component.loadGroupMembers();
    expect(snackBar.open).toHaveBeenCalledWith(
      'No se pudieron cargar los miembros del grupo.',
      'Cerrar',
      expect.any(Object),
    );
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
