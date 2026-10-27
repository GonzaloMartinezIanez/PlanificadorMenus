import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { RecipeService } from '../../../services/recipe.service';
import { Recipe, RecipeComment } from '../../../models/recipe';
import { PaginatedResponse } from '../../../models/paginated-response';
import { RecipeDetail } from './recipe-detail';

describe('RecipeDetail', () => {
  let component: RecipeDetail;
  let fixture: ComponentFixture<RecipeDetail>;
  const authService = {
    currentUser: signal({ id: 1, username: 'Gonzalo', profile_picture: null }),
    currentUserId: signal(1),
    isAuthenticated: vi.fn(),
  };
  const recipeService = {
    getCommentsByRecipeId: vi.fn(),
    getRecipeById: vi.fn(),
    getMyCommentByRecipeId: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    deleteRecipe: vi.fn(),
  };
  const router = { navigate: vi.fn() };
  const route = { snapshot: { paramMap: { get: vi.fn() } } };
  const snackBar = { open: vi.fn() };
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [RecipeDetail],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: RecipeService, useValue: recipeService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeDetail);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('appends comment pages and keeps the current user comment separate', () => {
    recipeService.getCommentsByRecipeId.mockReturnValueOnce(
      of({ count: 2, next: '?page=2', previous: null, results: [{ user_id: 2, comment: 'Primero' }] }),
    );
    component.loadComments(4);
    expect(component.nextCommentsPage()).toBe(2);
    recipeService.getCommentsByRecipeId.mockReturnValueOnce(
      of({
        count: 2,
        next: null,
        previous: '?page=1',
        results: [
          { user_id: 1, comment: 'Propio' },
          { user_id: 3, comment: 'Segundo' },
        ],
      }),
    );
    component.loadComments(4, 2);
    expect(component.comments().map((comment) => comment.user_id)).toEqual([2, 3]);
    expect(component.nextCommentsPage()).toBeNull();
    expect(recipeService.getCommentsByRecipeId).toHaveBeenLastCalledWith(4, 2, 'newest', []);
  });

  it('combines order and multiple ratings, resets pages and ignores a late response', () => {
    const old = new Subject<PaginatedResponse<RecipeComment>>();
    // Solo es necesario el ID para las llamadas de filtrado de este caso.
    component.recipe.set({ id: 4 } as Recipe);
    recipeService.getCommentsByRecipeId
      .mockReturnValueOnce(old)
      .mockReturnValue(of({ count: 1, next: '?page=2', previous: null, results: [{ user_id: 2 }] }));
    component.loadComments(4, 2);
    component.changeCommentOrder('oldest');
    component.changeCommentScores([5, 4]);
    expect(recipeService.getCommentsByRecipeId).toHaveBeenLastCalledWith(4, 1, 'oldest', [5, 4]);
    expect(component.comments().map((comment) => comment.user_id)).toEqual([2]);
    old.next({ count: 0, next: null, previous: null, results: [] });
    expect(component.comments().map((comment) => comment.user_id)).toEqual([2]);
    component.loadMoreComments();
    expect(recipeService.getCommentsByRecipeId).toHaveBeenLastCalledWith(4, 2, 'oldest', [5, 4]);
    component.changeCommentScores([]);
    expect(recipeService.getCommentsByRecipeId).toHaveBeenLastCalledWith(4, 1, 'oldest', []);
  });

  it('shows Madrid time without seconds across winter and summer offsets', () => {
    expect(component.formatCommentDate('2026-01-15T23:45:59Z')).toBe('16/01/2026 - 00:45');
    expect(component.formatCommentDate('2026-07-15T23:45:59Z')).toBe('16/07/2026 - 01:45');
  });

  it('keeps comments and pagination visible while replacing the filtered results', () => {
    const oldComment: RecipeComment = {
      recipe: '4',
      user_id: 2,
      user: 'Ana',
      score: 5,
      comment: 'Anterior',
      created_at: '2026-01-15T12:00:00Z',
    };
    const newComment: RecipeComment = { ...oldComment, user_id: 3, user: 'Luis', score: 4, comment: 'Nuevo' };
    const pending = new Subject<PaginatedResponse<RecipeComment>>();
    component.comments.set([oldComment]);
    component.nextCommentsPage.set(3);
    recipeService.getCommentsByRecipeId.mockReturnValueOnce(pending);
    component.loadComments(4);
    expect(component.comments()).toEqual([oldComment]);
    expect(component.nextCommentsPage()).toBe(3);
    expect(component.isLoadingComments()).toBe(true);
    pending.next({ count: 1, next: null, previous: null, results: [newComment] });
    expect(component.comments()).toEqual([newComment]);
    expect(component.nextCommentsPage()).toBeNull();
    expect(component.isLoadingComments()).toBe(false);
  });

  it('keeps the displayed results after a failed filter change and retries the first page', () => {
    component.comments.set([{ user_id: 2 } as RecipeComment]);
    component.nextCommentsPage.set(3);
    recipeService.getCommentsByRecipeId.mockReturnValueOnce(throwError(() => new Error('Network')));
    component.loadComments(4);
    expect(component.comments().map((comment) => comment.user_id)).toEqual([2]);
    expect(component.nextCommentsPage()).toBeNull();
    expect(component.commentsError()).not.toBe('');
    expect(component.isLoadingComments()).toBe(false);
  });

  it.each([
    [4, 5, false],
    [4, 6, true],
    [4, 7, true],
    [3, 4, false],
    [3, 5, true],
    [0, 0, false],
    [0, 1, true],
  ])('stacks sections with %i steps and %i ingredients: %s', (steps, ingredients, stacked) => {
    const recipe: Recipe = {
      id: 1,
      author: 'Gonzalo',
      is_author: true,
      name: 'Receta',
      creation_date: '2026-10-26',
      description: '',
      preparation_time: 20,
      steps: Array.from({ length: steps }, (_, index) => `Paso ${index + 1}`),
      visibility: 'PUBLIC',
      recipe_categories: [],
      num_valorations: 0,
      avg_score: 0,
      ingredients: Array.from({ length: ingredients }, (_, index) => ({
        id_ingredient: String(index),
        name: `Ingrediente ${index + 1}`,
        amount: 1,
        unit: 'ud',
      })),
    };
    expect(component.stackRecipeSections()).toBe(false);
    component.recipe.set(recipe);
    expect(component.formattedCreationDate()).toBe('26/10/2026');
    expect(component.stackRecipeSections()).toBe(stacked);
    component.recipe.set(null);
    expect(component.stackRecipeSections()).toBe(false);
  });

  it('should separates the current user comment from public comments', () => {
    recipeService.getCommentsByRecipeId.mockReturnValue(
      of({
        count: 2,
        next: null,
        previous: null,
        results: [
          { user_id: 1, score: 5, comment: 'Propio' },
          { user_id: 2, score: 4, comment: 'Otro' },
        ],
      }),
    );

    component.loadComments(4);

    expect(component.comments()).toEqual([{ user_id: 2, score: 4, comment: 'Otro' }]);
  });

  it('should fill and cancel the form when editing the current user comment', () => {
    component.myComment.set({ user_id: 1, score: 4, comment: 'Muy buena' } as never);

    component.startEditMyComment();
    expect(component.commentForm.value).toEqual({ score: 4, comment: 'Muy buena' });
    expect(component.isEditingMyComment()).toBe(true);

    component.cancelEditMyComment();
    expect(component.isEditingMyComment()).toBe(false);
    expect(component.commentForm.value).toEqual({ score: null, comment: '' });
  });
});
