import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ingredient, IngredientCategory } from '../models/ingredient';

@Injectable({
  providedIn: 'root',
})
export class IngredientService {
  private http = inject(HttpClient);

  getIngredientCategories(): Observable<IngredientCategory[]> {
    return this.http.get<IngredientCategory[]>(`${environment.apiUrl}/ingredient_categories/`);
  }

  getIngredientsByCategory(id_ingredient_category: number): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(
      `${environment.apiUrl}/ingredient_categories/${id_ingredient_category}/ingredients/`,
    );
  }

  searchIngredientsByName(name: string): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(
      `${environment.apiUrl}/ingredient_by_name/?name=${encodeURIComponent(name)}`, // Quita los espacios
    );
  }
}
