import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type FavoriteKind = 'ingredients' | 'recipes';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);

  setFavorite(kind: FavoriteKind, id: string | number, favorite: boolean) {
    const url = `${environment.apiUrl}/${kind}/${encodeURIComponent(id)}/favorite/`;
    return favorite
      ? this.http.put<{ is_favorite: boolean }>(url, {})
      : this.http.delete<{ is_favorite: boolean }>(url);
  }
}
