import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { GoogleLogin } from '../google-login/google-login';

@Component({
  selector: 'app-login-dialog',
  imports: [MatButtonModule, MatDialogContent, MatDialogTitle, GoogleLogin],
  templateUrl: './login-dialog.html',
  styleUrl: './login-dialog.css',
})
export class LoginDialog {
  private readonly groupService = inject(GroupService);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<LoginDialog>);
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
          this.dialogRef.close();
          void this.router.navigate(commands);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los grupos del usuario.');
          this.isLoading.set(false);
        },
      });
  }
}
