import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { RecipeService } from './recipe.service';

describe('RecipeService', () => {
  let service: RecipeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecipeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should get recipes', () => {
    service.getRecipes().subscribe();
    const recipesRequest = http.expectOne(`${environment.apiUrl}/recipes/`);
    expect(recipesRequest.request.method).toBe('GET');
    recipesRequest.flush([]);
  });

  it('should get recipe categories', () => {
    service.getRecipesCategories().subscribe();
    const categoriesRequest = http.expectOne(`${environment.apiUrl}/recipe_category/`);
    expect(categoriesRequest.request.method).toBe('GET');
    categoriesRequest.flush([]);
  });

  it('should get popular recipes', () => {
    service.getTopRecipes().subscribe();
    const topRequest = http.expectOne(`${environment.apiUrl}/recipes/top/`);
    expect(topRequest.request.method).toBe('GET');
    topRequest.flush([]);
  });

  it('should get recipes filtered by category and name', () => {
    service.searchRecipes('tortilla', [1, 3]).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/recipes/search/?name=tortilla&categories=1,3`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should get recipe by id', () => {
    service.getRecipeById(12).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/recipes/12/`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('should create a recipe', () => {
    const recipe = { name: 'Tortilla' };
    service.createRecipe(recipe).subscribe();
    const createRequest = http.expectOne(`${environment.apiUrl}/recipes/`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(recipe);
    createRequest.flush({ id: 1 });
  });

  it('should update a recipe', () => {
    const recipe = { name: 'Tortilla' };
    service.updateRecipe(1, recipe).subscribe();
    const updateRequest = http.expectOne(`${environment.apiUrl}/recipes/1/`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(recipe);
    updateRequest.flush({ id: 1 });
  });

  it('should delete a recipe', () => {
    service.deleteRecipe(1).subscribe();
    const deleteRequest = http.expectOne(`${environment.apiUrl}/recipes/1/`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ message: 'Eliminada' });
  });

  it('should get recipe comments', () => {
    service.getCommentsByRecipeId(4).subscribe();
    const commentsRequest = http.expectOne(`${environment.apiUrl}/comments/4/`);
    expect(commentsRequest.request.method).toBe('GET');
    commentsRequest.flush([]);
  });

  it('should get the current user comment', () => {
    service.getMyCommentByRecipeId(4).subscribe();
    const myCommentRequest = http.expectOne(`${environment.apiUrl}/comments/4/mine/`);
    expect(myCommentRequest.request.method).toBe('GET');
    myCommentRequest.flush({ comment: null });
  });

  it('should create a comment', () => {
    service.createComment(4, 5, 'Muy buena').subscribe();
    const createRequest = http.expectOne(`${environment.apiUrl}/comments/4/`);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({ score: 5, comment: 'Muy buena' });
    createRequest.flush({});
  });

  it('should update a comment', () => {
    service.updateComment(4, 4, 'Actualizada').subscribe();
    const updateRequest = http.expectOne(`${environment.apiUrl}/comments/4/`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({ score: 4, comment: 'Actualizada' });
    updateRequest.flush({});
  });

  it('should delete a comment', () => {
    service.deleteComment(4, 8).subscribe();
    const deleteRequest = http.expectOne(`${environment.apiUrl}/comments/4/8/`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ message: 'Eliminado' });
  });
});
