import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, Input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroupService } from '../../../services/group.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RealtimeService } from '../../../services/realtime.service';

@Component({
  selector: 'app-group-forms',
  imports: [ReactiveFormsModule, CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSnackBarModule],
  templateUrl: './group-forms.html',
  styleUrl: './group-forms.css',
})
export class GroupForms {
  @Input() title = '';
  @Input() subtitle = '';
  showCheckAcceptedButton = signal(false);
  requestedGroupCode = signal('');

  groupService = inject(GroupService);
  router = inject(Router);
  authService = inject(AuthService);
  snackBar = inject(MatSnackBar);

  newGroupForm: FormGroup;
  joinGroupForm: FormGroup;

  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private realtime = inject(RealtimeService);

  constructor() {
    this.newGroupForm = this.fb.group({
      group_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      group_description: [''],
    });

    this.joinGroupForm = this.fb.group({
      group_code: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
    });
    this.realtime
      .watchGroup(() => this.requestedGroupCode(), ['membership.decided', 'membership.changed', 'group.deleted'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!this.requestedGroupCode()) return;
        if (event.status === 'rejected' || event.type === 'group.deleted') {
          this.showCheckAcceptedButton.set(false);
          this.showInfo(
            event.type === 'group.deleted' ? 'El grupo ya no está disponible.' : 'Tu solicitud ha sido rechazada.',
          );
          this.requestedGroupCode.set('');
        } else this.refreshMembership();
      });
  }

  private refreshMembership(): void {
    const code = this.requestedGroupCode();
    this.groupService
      .getMembershipStatus(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (membership) => {
          if (code !== this.requestedGroupCode()) return;
          if (membership.status === 'accepted') void this.router.navigate(['/home', code]);
          this.showCheckAcceptedButton.set(membership.status === 'pending');
        },
        error: () => {},
      });
  }

  createGroup() {
    if (!this.newGroupForm.valid) {
      return;
    }

    this.groupService.createGroup(this.newGroupForm.value).subscribe({
      next: (res) => {
        this.router.navigate([`/home/${res.group_code}`]);
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo crear el grupo.');
      },
    });
  }

  joinGroup() {
    if (!this.joinGroupForm.valid) {
      return;
    }

    const groupCode = this.joinGroupForm.value.group_code;

    this.groupService.joinGroup(groupCode).subscribe({
      next: (res) => {
        this.requestedGroupCode.set(groupCode);
        this.showCheckAcceptedButton.set(true);
        this.showInfo(res.message);
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo solicitar la unión al grupo.');
      },
    });
  }

  checkAccepted() {
    const code = this.requestedGroupCode();
    if (!code) return;
    this.groupService
      .getMembershipStatus(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (membership) => {
          if (code !== this.requestedGroupCode()) return;
          if (membership.status === 'accepted') {
            this.router.navigate(['/home', code]);
            return;
          }
          this.showCheckAcceptedButton.set(membership.status === 'pending');
          this.showInfo(
            membership.status === 'pending'
              ? 'Tu solicitud está pendiente de aprobación.'
              : 'No tienes una solicitud activa en este grupo.',
          );
        },
        error: () => this.showError('No se pudo comprobar el estado de la solicitud.'),
      });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['']);
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
