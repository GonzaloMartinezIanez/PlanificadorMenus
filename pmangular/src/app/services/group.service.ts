import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { GroupMember, GroupModel, GroupShortModel } from '../models/group';
import { Observable } from 'rxjs';
import { MessageModel } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private http = inject(HttpClient);

  getMyGroups(): Observable<GroupModel[]> {
    return this.http.get<GroupModel[]>(`${environment.apiUrl}/groups/`);
  }

  createGroup(group_info: GroupShortModel): Observable<GroupModel> {
    return this.http.post<GroupModel>(`${environment.apiUrl}/groups/`, group_info);
  }

  joinGroup(group_code: string): Observable<MessageModel> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/groups/${group_code}/`, {});
  }

  getGroupMembers(group_code: string): Observable<GroupMember[]> {
    return this.http.get<GroupMember[]>(`${environment.apiUrl}/groups/${group_code}/`);
  }

  updateGroup(group_code: string, group_info: GroupShortModel): Observable<{ message: GroupModel }> {
    return this.http.patch<{ message: GroupModel }>(`${environment.apiUrl}/groups/${group_code}/`, group_info);
  }

  updatePendingMember(group_code: string, user_id: number, accepted: boolean): Observable<MessageModel> {
    return this.http.patch<MessageModel>(`${environment.apiUrl}/groups/${group_code}/join/`, {
      user_id,
      accepted,
    });
  }

  updateMemberRole(group_code: string, user_id: number, role: string): Observable<MessageModel> {
    return this.http.patch<MessageModel>(`${environment.apiUrl}/groups/${group_code}/role/`, {
      user_id,
      role,
    });
  }

  removeMember(group_code: string, user_id: number): Observable<MessageModel> {
    return this.http.delete<MessageModel>(`${environment.apiUrl}/groups/${group_code}/${user_id}/`);
  }

  deleteGroup(group_code: string): Observable<MessageModel> {
    return this.http.delete<MessageModel>(`${environment.apiUrl}/groups/${group_code}/`);
  }
}
