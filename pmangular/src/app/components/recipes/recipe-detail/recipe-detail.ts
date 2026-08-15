import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../../services/recipe.service';
import { Recipe, RecipeComment } from '../../../models/recipe';
import { AuthService } from '../../../services/auth.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-recipe-detail',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    RouterLink,
  ],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.css',
})
export class RecipeDetail implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  recipeService = inject(RecipeService);
  authService = inject(AuthService);
  snackBar = inject(MatSnackBar);

  recipe = signal<Recipe | null>(null);
  comments = signal<RecipeComment[]>([]);
  myComment = signal<RecipeComment | null>(null);
  errorMessage = signal('');
  isLoading = signal(true);
  isEditingMyComment = signal(false);
  currentUser = this.authService.currentUser;

  commentForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.commentForm = this.fb.group({
      score: [null, [Validators.required, Validators.min(0), Validators.max(5)]],
      comment: [''],
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage.set('La receta no existe.');
      this.showError('La receta no existe.');
      this.isLoading.set(false);
      return;
    }

    this.loadRecipe(id);

    if (this.authService.isAuthenticated()) {
      this.loadComments(id);
      this.loadMyComment(id);
    }
  }

  loadRecipe(id: number) {
    this.recipeService.getRecipeById(id).subscribe({
      next: (recipe) => {
        this.recipe.set(recipe);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error.error ?? 'No se pudo cargar la receta.');
        this.showError(err.error.error ?? 'No se pudo cargar la receta.');
        this.isLoading.set(false);
      },
    });
  }

  loadComments(id: number) {
    this.recipeService.getCommentsByRecipeId(id).subscribe({
      next: (comments) => {
        this.comments.set(comments.filter((c) => c.user_id != this.authService.currentUserId()));
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudieron cargar los comentarios.');
      },
    });
  }

  loadMyComment(id: number) {
    this.recipeService.getMyCommentByRecipeId(id).subscribe({
      next: (comment) => {
        if ('user_id' in comment) {
          this.myComment.set(comment);
        } else {
          this.myComment.set(null);
        }
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo cargar tu comentario.');
      },
    });
  }

  submitComment() {
    const recipe = this.recipe();

    if (!recipe || !this.authService.isAuthenticated() || this.commentForm.invalid) {
      return;
    }

    if (this.myComment()) {
      this.updateMyComment();
      return;
    }

    this.recipeService
      .createComment(recipe.id, this.commentForm.value.score, this.commentForm.value.comment ?? '')
      .subscribe({
        next: () => {
          this.loadRecipe(recipe.id);
          this.loadComments(recipe.id);
          this.loadMyComment(recipe.id);
          this.showInfo('Comentario enviado correctamente.');
          this.commentForm.reset({
            score: null,
            comment: '',
          });
        },
        error: (err) => {
          this.showError(err.error.error ?? 'No se pudo enviar el comentario.');
        },
      });
  }

  startEditMyComment() {
    const myComment = this.myComment();

    if (!myComment) {
      return;
    }

    this.commentForm.patchValue({
      score: myComment.score,
      comment: myComment.comment ?? '',
    });
    this.isEditingMyComment.set(true);
  }

  cancelEditMyComment() {
    this.commentForm.reset({
      score: null,
      comment: '',
    });
    this.isEditingMyComment.set(false);
  }

  updateMyComment() {
    const recipe = this.recipe();
    const myComment = this.myComment();

    if (!recipe || !myComment || this.commentForm.invalid) {
      return;
    }

    this.recipeService
      .updateComment(recipe.id, this.commentForm.value.score, this.commentForm.value.comment ?? '')
      .subscribe({
        next: () => {
          this.loadRecipe(recipe.id);
          this.loadComments(recipe.id);
          this.loadMyComment(recipe.id);
          this.cancelEditMyComment();
          this.showInfo('Comentario actualizado correctamente.');
        },
        error: (err) => {
          this.showError(err.error.error ?? 'No se pudo actualizar el comentario.');
        },
      });
  }

  deleteMyComment() {
    const recipe = this.recipe();
    const myComment = this.myComment();

    if (!recipe || !myComment) {
      return;
    }

    this.recipeService.deleteComment(recipe.id, myComment.user_id).subscribe({
      next: () => {
        this.loadRecipe(recipe.id);
        this.loadComments(recipe.id);
        this.loadMyComment(recipe.id);
        this.cancelEditMyComment();
        this.showInfo('Comentario eliminado correctamente.');
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo eliminar el comentario.');
      },
    });
  }

  isRecipeOwner() {
    return this.recipe()?.is_author ?? false;
  }

  deleteCommentText(user_id: number) {
    const recipe = this.recipe();

    if (!recipe) {
      return;
    }

    this.recipeService.deleteComment(recipe.id, user_id).subscribe({
      next: () => {
        this.loadRecipe(recipe.id);
        this.loadComments(recipe.id);
        this.loadMyComment(recipe.id);
        this.showInfo('Texto del comentario eliminado correctamente.');
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo eliminar el texto del comentario.');
      },
    });
  }

  deleteRecipe() {
    const recipe = this.recipe();

    if (!recipe || !this.isRecipeOwner()) {
      return;
    }

    const confirmed = window.confirm('¿Seguro que quieres borrar esta receta?');

    if (!confirmed) {
      return;
    }

    this.recipeService.deleteRecipe(recipe.id).subscribe({
      next: () => {
        this.showInfo('Receta eliminada correctamente.');
        this.router.navigate(['/recipes']);
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo eliminar la receta.');
      },
    });
  }

  showInfo(message: string) {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-error'],
    });
  }
}
