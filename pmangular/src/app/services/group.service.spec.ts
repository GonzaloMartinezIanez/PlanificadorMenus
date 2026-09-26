import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { GroupService } from './group.service';

describe('GroupService', () => {
  let service: GroupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GroupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should get user\' groups', () => {
    service.getMyGroups().subscribe();

    const request = http.expectOne(`${environment.apiUrl}/groups/`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should create a group', () => {
    const group = { group_name: 'Familia', group_description: 'Menús de casa' };
    service.createGroup(group).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/groups/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(group);
    request.flush({ ...group, group_code: 'ABC123', creation_date: '2026-01-01' });
  });

  it('should send petition to join a group', () => {
    service.joinGroup('ABC123').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/groups/ABC123/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ message: 'Solicitud enviada' });
  });

  it('should get the groups users', () => {
    service.getGroupMembers('ABC123').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/groups/ABC123/`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should update group information', () => {
    const group = { group_name: 'Familia', group_description: 'Actualizado' };
    service.updateGroup('ABC123', group).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/groups/ABC123/`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(group);
    request.flush({ message: { ...group, group_code: 'ABC123', creation_date: '2026-01-01' } });
  });

  it('should grant access for a user to a group', () => {
    service.updatePendingMember('ABC123', 7, true).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/groups/ABC123/join/`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ user_id: 7, accepted: true });
    request.flush({ message: 'Aceptado' });
  });

  it('should change an user role', () => {
    service.updateMemberRole('ABC123', 7, 'ADMIN').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/groups/ABC123/role/`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ user_id: 7, role: 'ADMIN' });
    request.flush({ message: 'Actualizado' });
  });

  it('should remove an user from a group (also expell)', () => {
    service.removeMember('ABC123', 7).subscribe();
    const removeRequest = http.expectOne(`${environment.apiUrl}/groups/ABC123/7/`);
    expect(removeRequest.request.method).toBe('DELETE');
    removeRequest.flush({ message: 'Eliminado' });

    service.leaveGroup('ABC123', 8).subscribe();
    const leaveRequest = http.expectOne(`${environment.apiUrl}/groups/ABC123/8/`);
    expect(leaveRequest.request.method).toBe('DELETE');
    leaveRequest.flush({ message: 'Abandonado' });
  });

  it('should delete a group', () => {
    service.deleteGroup('ABC123').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/groups/ABC123/`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ message: 'Eliminado' });
  });
});
