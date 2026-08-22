import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Ingredient } from '../models/ingredient';
import { ListItem, ListPatchItem, ListResponse } from '../models/lists';
import { Observable } from 'rxjs';
import { MessageModel } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class ListService {
  private http = inject(HttpClient);

  getLists(group_code: string): Observable<ListResponse> {
    return this.http.get<ListResponse>(`${environment.apiUrl}/lists/${group_code}/`);
  }

  postListItem(group_code: string, ingredient: ListItem): Observable<MessageModel> {
    return this.http.post<MessageModel>(`${environment.apiUrl}/lists/${group_code}/`, ingredient);
  }

  changeAmountListItem(
    group_code: string,
    id_ingredient: string,
    patchItem: ListPatchItem,
  ): Observable<MessageModel> {
    return this.http.patch<MessageModel>(
      `${environment.apiUrl}/lists/${group_code}/${id_ingredient}/`,
      patchItem,
    );
  }

  changeStatusListItem(
    group_code: string,
    id_ingredient: string,
    status: boolean,
  ): Observable<MessageModel> {
    return this.http.patch<MessageModel>(
      `${environment.apiUrl}/lists/${group_code}/${id_ingredient}/`,
      { bought: status },
    );
  }

  deleteList(group_code: string): Observable<MessageModel> {
    return this.http.delete<MessageModel>(`${environment.apiUrl}/lists/${group_code}/`);
  }
}
