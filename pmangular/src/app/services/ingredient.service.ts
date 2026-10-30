import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ingredient, IngredientCategory } from '../models/ingredient';
import { PaginatedResponse } from '../models/paginated-response';

@Injectable({
  providedIn: 'root',
})
export class IngredientService {
  private http = inject(HttpClient);

  getIngredientCategories(): Observable<IngredientCategory[]> {
    return this.http.get<IngredientCategory[]>(`${environment.apiUrl}/ingredient_categories/`);
  }

  getIngredientsByCategory(
    id_ingredient_category: number,
    page = 1,
    favorites = false,
  ): Observable<PaginatedResponse<Ingredient>> {
    return this.http.get<PaginatedResponse<Ingredient>>(
      `${environment.apiUrl}/ingredient_categories/${id_ingredient_category}/ingredients/`,
      { params: { ...(page > 1 ? { page } : {}), ...(favorites ? { favorites: true } : {}) } },
    );
  }

  searchIngredientsByName(
    name: string,
    page = 1,
    category?: number,
    favorites = false,
  ): Observable<PaginatedResponse<Ingredient>> {
    return this.http.get<PaginatedResponse<Ingredient>>(
      `${environment.apiUrl}/ingredient_by_name/?name=${encodeURIComponent(name)}`, // Quita los espacios
      {
        params: {
          ...(page > 1 ? { page } : {}),
          ...(category ? { category } : {}),
          ...(favorites ? { favorites: true } : {}),
        },
      },
    );
  }
}
