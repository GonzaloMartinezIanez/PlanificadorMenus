import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GoogleLogin } from '../google-login/google-login';
import { GroupService } from '../../services/group.service';

@Component({
  selector: 'app-landing',
  imports: [MatButtonModule, MatIconModule, RouterLink, GoogleLogin],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  readonly auth = inject(AuthService);
  private readonly groupService = inject(GroupService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);

  onLoadingChange(loading: boolean): void {
    this.isLoading.set(loading);
    if (loading) this.errorMessage.set('');
  }

  onAuthenticated(): void {
    this.isLoading.set(true);
    this.groupService
      .getInitialRoute()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (commands) => {
          this.isLoading.set(false);
          void this.router.navigate(commands);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los grupos del usuario.');
          this.isLoading.set(false);
        },
      });
  }
}
