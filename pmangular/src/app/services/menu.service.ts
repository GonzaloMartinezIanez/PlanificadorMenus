import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuModel, ShortMenuModel } from '../models/menu';
import { environment } from '../../environments/environment';
import { MessageModel } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private http = inject(HttpClient);

  getMenus(group_code: string): Observable<MenuModel[]> {
    return this.http.get<MenuModel[]>(`${environment.apiUrl}/menus/${group_code}/`);
  }

  postMenus(group_code: string, menu: ShortMenuModel): Observable<MenuModel> {
    return this.http.post<MenuModel>(`${environment.apiUrl}/menus/${group_code}/`, menu);
  }

  deleteMenus(group_code: string, menu: ShortMenuModel): Observable<MessageModel> {
    return this.http.delete<MessageModel>(`${environment.apiUrl}/menus/${group_code}/`, {
      body: menu,
    });
  }
}
