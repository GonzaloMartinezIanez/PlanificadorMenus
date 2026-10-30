import { Component, DestroyRef, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { FavoriteKind, FavoriteService } from '../../services/favorite.service';

@Component({
  selector: 'app-favorite-button',
  imports: [MatButtonModule, MatTooltipModule],
  template: `
    @if (auth.isAuthenticated()) {
      <button
        mat-icon-button
        class="app-favorite-button"
        type="button"
        [disabled]="saving()"
        [attr.aria-pressed]="active"
        [attr.aria-label]="(active ? 'Quitar de favoritos: ' : 'Añadir a favoritos: ') + name"
        [matTooltip]="active ? 'Quitar de favoritos' : 'Añadir a favoritos'"
        (click)="toggle()"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" [class.active]="active">
          <path d="M12 21 3.4 12.6C-1.8 7.3 5.7.2 11 5.5l1 1 1-1c5.3-5.3 12.8 1.8 7.6 7.1Z" />
        </svg>
      </button>
    }
  `,
  styleUrl: './favorite-button.css',
})
export class FavoriteButton {
  @Input({ required: true }) kind!: FavoriteKind;
  @Input({ required: true }) itemId!: string | number;
  @Input() name = '';
  @Input() active = false;
  @Output() favoriteChanged = new EventEmitter<boolean>();
  readonly saving = signal(false);
  readonly auth = inject(AuthService);
  private readonly service = inject(FavoriteService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  toggle(): void {
    if (this.saving() || !this.auth.isAuthenticated()) return;
    const userId = this.auth.currentUserId();
    this.saving.set(true);
    this.service
      .setFavorite(this.kind, this.itemId, !this.active)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: ({ is_favorite }) => {
          if (userId === this.auth.currentUserId() && this.auth.isAuthenticated()) {
            this.favoriteChanged.emit(is_favorite);
          }
        },
        error: () =>
          this.snackBar.open('No se pudo guardar el favorito. Vuelve a intentarlo.', 'Cerrar', { duration: 5000 }),
      });
  }
}
