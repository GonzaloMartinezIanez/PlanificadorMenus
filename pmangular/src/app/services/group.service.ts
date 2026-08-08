import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { GroupModel, GroupShortModel } from '../models/group';
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

  getGroupMembers(group_code: string) {
    return this.http.get(`${environment.apiUrl}/groups/${group_code}/`);
  }
}
