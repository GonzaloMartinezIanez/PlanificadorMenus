import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
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
  @Input() showCheckAcceptedButton = false;
  @Input() showLogoutButton = false;

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

    this.groupService.joinGroup(this.joinGroupForm.value.group_code).subscribe({
      next: (res) => {
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
        if (res.length > 0) this.router.navigate([`/home/${res[0].group_code}`]);
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
