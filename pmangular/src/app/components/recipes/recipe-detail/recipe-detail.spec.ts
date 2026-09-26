import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../services/auth.service';
import { RecipeService } from '../../../services/recipe.service';
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
