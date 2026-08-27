import { CommonModule } from '@angular/common';
import { Component, inject, Input, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GroupService } from '../../../services/group.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-group-forms',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
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

  constructor(private fb: FormBuilder) {
    this.newGroupForm = this.fb.group({
      group_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      group_description: [''],
    });

    this.joinGroupForm = this.fb.group({
      group_code: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
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
    this.groupService.getMyGroups().subscribe({
      next: (res) => {
        const acceptedGroup = res.find((group) => group.group_code === this.requestedGroupCode());

        if (acceptedGroup) {
          this.router.navigate([`/home/${res[0].group_code}`]);
          return;
        }

        this.showInfo('Tu solicitud está pendiente de aprobación.');
      },
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
