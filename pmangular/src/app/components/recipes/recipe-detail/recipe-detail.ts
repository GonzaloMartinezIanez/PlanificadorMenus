import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../../services/recipe.service';
import { Recipe, RecipeComment, CommentOrder } from '../../../models/recipe';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../services/auth.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { RecipeRating } from '../recipe-rating/recipe-rating';
import { ConfirmDialog } from '../../../core/confirm-dialog/confirm-dialog';
import { MatDialog } from '@angular/material/dialog';

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
    MatChipsModule,
    RecipeRating,
    MatSelectModule,
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
  // Es una fecha de calendario: se muestra sin convertirla a una hora o zona horaria.
  formattedCreationDate = computed(() => this.recipe()?.creation_date?.split('-').reverse().join('/') ?? '');
  stackRecipeSections = computed(() => {
    const recipe = this.recipe();
    return !!recipe && recipe.ingredients.length > 0 && recipe.ingredients.length >= recipe.steps.length * 1.5;
  });
  comments = signal<RecipeComment[]>([]);
  commentOrder = signal<CommentOrder>('newest');
  commentScores = signal<number[]>([]);
  readonly scoreFilters = [5, 4, 3, 2, 1, 0];
  private readonly commentDateFormatter = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  nextCommentsPage = signal<number | null>(null);
  isLoadingComments = signal(false);
  commentsError = signal('');
  private commentsRequestId = 0;
  private destroyRef = inject(DestroyRef);
  myComment = signal<RecipeComment | null>(null);
  errorMessage = signal('');
  isLoading = signal(true);
  isEditingMyComment = signal(false);
  currentUser = this.authService.currentUser;

  commentForm: FormGroup;
  dialog = inject(MatDialog);

  private fb = inject(FormBuilder);

  constructor() {
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

  loadComments(id: number, page = 1) {
    const requestId = ++this.commentsRequestId;
    if (page === 1) {
      this.comments.set([]);
      this.nextCommentsPage.set(null);
    }
    this.isLoadingComments.set(true);
    this.commentsError.set('');
    this.recipeService
      .getCommentsByRecipeId(id, page, this.commentOrder(), this.commentScores())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.commentsRequestId) return;
          const comments = response.results.filter((c) => c.user_id != this.authService.currentUserId());
          this.comments.update((current) => (page === 1 ? comments : [...current, ...comments]));
          this.nextCommentsPage.set(response.next ? page + 1 : null);
          this.isLoadingComments.set(false);
        },
        error: () => {
          if (requestId !== this.commentsRequestId) return;
          this.commentsError.set('No se pudieron cargar los comentarios. Vuelve a intentarlo.');
          this.isLoadingComments.set(false);
        },
      });
  }

  loadMoreComments() {
    const recipe = this.recipe();
    const page = this.nextCommentsPage();
    if (recipe && page && !this.isLoadingComments()) this.loadComments(recipe.id, page);
  }

  changeCommentOrder(order: CommentOrder) {
    this.commentOrder.set(order);
    const recipe = this.recipe();
    if (recipe) this.loadComments(recipe.id);
  }

  changeCommentScores(scores: number[]) {
    this.commentScores.set(scores);
    const recipe = this.recipe();
    if (recipe) this.loadComments(recipe.id);
  }

  formatCommentDate(value: string) {
    return this.commentDateFormatter.format(new Date(value)).replace(', ', ' - ');
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

  opendDeleteDialog() {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Eliminar receta',
          message: '¿Seguro que quieres borrar la receta?',
          confirmText: 'Eliminar',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.deleteRecipe();
        }
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
