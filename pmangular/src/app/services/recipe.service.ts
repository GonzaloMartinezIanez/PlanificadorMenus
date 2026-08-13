import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Recipe, RecipeCategory, RecipeComment } from '../models/recipe';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private http = inject(HttpClient);

  getRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${environment.apiUrl}/recipes/`);
  }

  searchRecipes(name: string, categoryIds: number[]): Observable<Recipe[]> {
    const url = `${environment.apiUrl}/recipes/search/?name${name}=&categories=${categoryIds.join(',')}`;
    return this.http.get<Recipe[]>(url);
  }

  getTopRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${environment.apiUrl}/recipes/top/`);
  }

  getRecipesCategories(): Observable<RecipeCategory[]> {
    return this.http.get<RecipeCategory[]>(`${environment.apiUrl}/recipe_category/`);
  }

  getRecipeById(id: number): Observable<Recipe> {
    return this.http.get<Recipe>(`${environment.apiUrl}/recipes/${id}/`);
  }

  getCommentsByRecipeId(id: number): Observable<RecipeComment[]> {
    return this.http.get<RecipeComment[]>(`${environment.apiUrl}/comments/${id}/`);
  }

  getMyCommentByRecipeId(id: number): Observable<RecipeComment | { comment: null }> {
    return this.http.get<RecipeComment | { comment: null }>(
      `${environment.apiUrl}/comments/${id}/mine/`,
    );
  }

  createComment(id: number, score: number, comment: string) {
    return this.http.post<RecipeComment>(`${environment.apiUrl}/comments/${id}/`, {
      score,
      comment,
    });
  }

  updateComment(id: number, score: number, comment: string) {
    return this.http.put<RecipeComment>(`${environment.apiUrl}/comments/${id}/`, {
      score,
      comment,
    });
  }

  deleteComment(id_recipe: number, id_user: number) {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}/comments/${id_recipe}/${id_user}/`,
    );
  }
}
