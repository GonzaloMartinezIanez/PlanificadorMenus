import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupService } from '../../../services/group.service';
import { AuthService } from '../../../services/auth.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GoogleLogin } from '../../../core/google-login/google-login';
import { RealtimeService } from '../../../services/realtime.service';

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
  private realtime = inject(RealtimeService);
  private membershipRequestId = 0;

  groupCode = signal('');
  isLoading = signal(false);
  hasRequestedJoin = signal(false);

  ngOnInit(): void {
    const groupCode = this.route.snapshot.paramMap.get('group_code');
    if (groupCode) this.groupCode.set(groupCode);
    this.realtime
      .watchGroup(() => this.groupCode(), ['membership.decided', 'membership.changed', 'group.deleted'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!this.authService.isAuthenticated()) return;
        if (event.status === 'rejected' || event.type === 'group.deleted') {
          this.hasRequestedJoin.set(false);
          this.showInfo(
            event.type === 'group.deleted' ? 'El grupo ya no está disponible.' : 'Tu solicitud ha sido rechazada.',
          );
        } else this.checkAccepted(true);
      });
    if (this.authService.isAuthenticated()) this.checkAccepted(true);
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

  checkAccepted(silent = false): void {
    const groupCode = this.groupCode();
    if (!groupCode) return;
    const requestId = ++this.membershipRequestId;
    this.isLoading.set(true);
    this.groupService
      .getMembershipStatus(groupCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (membership) => {
          if (requestId !== this.membershipRequestId || groupCode !== this.groupCode()) return;
          this.isLoading.set(false);
          if (membership.status === 'accepted') {
            this.router.navigate(['/home', groupCode]);
            return;
          }
          this.hasRequestedJoin.set(membership.status === 'pending');
          if (!silent)
            this.showInfo(
              membership.status === 'pending'
                ? 'Tu solicitud está pendiente de aprobación.'
                : 'No tienes una solicitud activa en este grupo.',
            );
        },
        error: () => {
          if (requestId !== this.membershipRequestId || groupCode !== this.groupCode()) return;
          this.isLoading.set(false);
          if (!silent) this.showError('No se pudo comprobar el estado de la solicitud.');
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
      .getMembershipStatus(groupCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (membership) => {
          if (membership.status === 'accepted') {
            this.isLoading.set(false);
            this.router.navigate(['/home', groupCode]);
          } else if (membership.status === 'pending') {
            this.isLoading.set(false);
            this.hasRequestedJoin.set(true);
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
