import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupService } from '../../../services/group.service';
import { AuthService } from '../../../services/auth.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoogleLogin } from '../../../core/google-login/google-login';

@Component({
  selector: 'app-group-join',
  imports: [RouterLink, MatButtonModule, MatSnackBarModule, GoogleLogin],
  templateUrl: './group-join.html',
  styleUrl: './group-join.css',
})
export class GroupJoin implements OnInit {
  groupService = inject(GroupService);
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  groupCode = signal('');
  isLoading = signal(false);
  hasRequestedJoin = signal(false);

  ngOnInit(): void {
    const groupCode = this.route.snapshot.paramMap.get('group_code');
    if (groupCode) this.groupCode.set(groupCode);
    if (this.authService.isAuthenticated()) this.redirectIfAlreadyMember();
  }

  joinGroup(): void {
    if (!this.authService.isAuthenticated()) {
      this.showError('Debes iniciar sesión para unirte al grupo.');
      return;
    }
    this.isLoading.set(true);
    this.groupService
      .joinGroup(this.groupCode())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.showInfo(res.message);
          this.hasRequestedJoin.set(true);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.showError(err.error?.error ?? 'No se pudo solicitar la unión al grupo.');
          this.isLoading.set(false);
        },
      });
  }

  checkAccepted(): void {
    const groupCode = this.groupCode();
    if (!groupCode) return;
    this.isLoading.set(true);
    this.groupService
      .getMyGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          const group = groups.find((item) => item.group_code === groupCode);
          this.isLoading.set(false);
          if (group) {
            this.router.navigate(['/home', group.group_code]);
            return;
          }
          this.showInfo('Tu solicitud está pendiente de aprobación.');
        },
        error: () => {
          this.isLoading.set(false);
          this.showError('No se pudo comprobar el estado de la solicitud.');
        },
      });
  }

  onAuthenticated(): void {
    const groupCode = this.groupCode();
    if (!groupCode) {
      this.isLoading.set(false);
      this.showError('El enlace de invitación no es válido.');
      return;
    }
    this.isLoading.set(true);
    this.groupService
      .getMyGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          const group = groups.find((item) => item.group_code === groupCode);
          if (group) {
            this.isLoading.set(false);
            this.router.navigate(['/home', group.group_code]);
          } else {
            this.joinGroup();
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.showError('No se pudo comprobar el grupo al que quieres unirte.');
        },
      });
  }

  private redirectIfAlreadyMember(): void {
    const groupCode = this.groupCode();
    if (!groupCode) return;
    this.groupService
      .getMyGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          const group = groups.find((item) => item.group_code === groupCode);
          if (group) this.router.navigate(['/home', group.group_code]);
        },
        error: () => this.showError('No se pudo comprobar el grupo al que quieres unirte.'),
      });
  }

  showInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-error'],
    });
  }
}
