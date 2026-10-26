import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { RecipeService } from '../../../services/recipe.service';
import { Recipe } from '../../../models/recipe';
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
    expect(component.stackRecipeSections()).toBe(stacked);
    component.recipe.set(null);
    expect(component.stackRecipeSections()).toBe(false);
  });

  it('should separates the current user comment from public comments', () => {
    recipeService.getCommentsByRecipeId.mockReturnValue(
      of([
        { user_id: 1, score: 5, comment: 'Propio' },
        { user_id: 2, score: 4, comment: 'Otro' },
      ]),
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
