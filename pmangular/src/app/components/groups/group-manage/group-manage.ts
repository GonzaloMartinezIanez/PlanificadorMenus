import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { GroupService } from '../../../services/group.service';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { GroupMember, GroupModel } from '../../../models/group';
import { filter } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../services/auth.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'app-group-manage',
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, RouterLink],
  templateUrl: './group-manage.html',
  styleUrl: './group-manage.css',
})
export class GroupManage implements OnInit {
  groupService = inject(GroupService);
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  snackBar = inject(MatSnackBar);

  displayedAcceptedColumns: string[] = ['username', 'role', 'joining_date', 'actions'];
  displayedPendingColumns: string[] = ['username', 'role', 'joining_date', 'actions'];

  myGroups = signal<GroupModel[]>([]);
  selectedGroupCode = signal('');
  selectedGroup = computed<GroupModel | undefined>(() => this.myGroups().find(g => g.group_code === this.selectedGroupCode()));
  groupMembers = signal<GroupMember[]>([]);

  currentUserId = this.authService.currentUserId;
  currentMembership = computed(() => this.groupMembers().find(member => member.user_id === this.currentUserId()));
  isAdmin = computed(() => this.currentMembership()?.role === 'ADMIN');

  acceptedMembers = computed(() => this.groupMembers().filter(member => member.accepted));
  pendingMembers = computed(() => this.groupMembers().filter(member => !member.accepted));
  qrCodeUrl = signal('');

  groupForm: FormGroup;

  joinUrl = computed(() => `/groups/${this.selectedGroupCode()}/join`);
  joinUrlLong = computed(() => `${environment.frontendUrl}${this.joinUrl()}`);

  constructor(private fb: FormBuilder) {
    this.groupForm = this.fb.group({
      group_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      group_description: [''],
    });
  }

  ngOnInit(): void {
    this.updateSelectedGroupFromUrl();

    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSelectedGroupFromUrl();
      this.syncGroupForm();
      this.loadQRCode();
      this.loadGroupMembers();
    });

    this.groupService.getMyGroups().subscribe({
      next: (groups) => {
        this.myGroups.set(groups);
        this.syncGroupForm();
        this.loadQRCode();
      }
    });

    this.syncGroupForm();
    this.loadQRCode();
    this.loadGroupMembers();
  }

  saveGroup() {
    if (!this.isAdmin() || this.groupForm.invalid) {
      return;
    }

    this.groupService.updateGroup(this.selectedGroupCode(), this.groupForm.value).subscribe({
      next: (res) => {
        this.myGroups.update((groups) =>
          groups.map((group) =>
            group.group_code === this.selectedGroupCode() ? res.message : group
          )
        );
        this.syncGroupForm();
        this.showInfo('Grupo actualizado correctamente.');
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo actualizar el grupo.');
      }
    });
  }

  acceptMember(user_id: number) {
    this.updatePendingMember(user_id, true);
  }

  rejectMember(user_id: number) {
    this.updatePendingMember(user_id, false);
  }

  changeRole(user_id: number, role: string) {
    this.groupService.updateMemberRole(this.selectedGroupCode(), user_id, role).subscribe({
      next: () => {
        this.loadGroupMembers();
        this.showInfo('Rol actualizado correctamente.');
      },
      error: (err) => {
        this.loadGroupMembers();
        this.showError(err.error.error ?? 'No se pudo actualizar el rol.');
      }
    });
  }

  removeMember(user_id: number) {
    this.groupService.removeMember(this.selectedGroupCode(), user_id).subscribe({
      next: () => {
        this.loadGroupMembers();
        this.showInfo('Usuario eliminado correctamente.');
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo eliminar el usuario.');
      }
    });
  }

  deleteGroup() {
    if (!this.isAdmin()) {
      return;
    }

    const confirmed = window.confirm('¿Seguro que quieres eliminar este grupo?');
    if (!confirmed) {
      return;
    }

    this.groupService.deleteGroup(this.selectedGroupCode()).subscribe({
      next: () => {
        const remainingGroups = this.myGroups().filter(group => group.group_code !== this.selectedGroupCode());
        this.myGroups.set(remainingGroups);
        this.showInfo('Grupo eliminado correctamente.');

        if (remainingGroups.length > 0) {
          this.router.navigate(['/home', remainingGroups[0].group_code]);
        } else {
          this.router.navigate(['/group-onboarding']);
        }
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo eliminar el grupo.');
      }
    });
  }

  updateSelectedGroupFromUrl() {
    let currentRoute = this.route.root;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const groupCode = currentRoute.snapshot.paramMap.get('group_code');
    if (groupCode) {
      this.selectedGroupCode.set(groupCode);
    }
  }

  syncGroupForm() {
    const currentGroup = this.selectedGroup();

    if (!currentGroup) {
      this.groupForm.reset({
        group_name: '',
        group_description: '',
      });
      return;
    }

    this.groupForm.patchValue({
      group_name: currentGroup.group_name,
      group_description: currentGroup.group_description,
    });
    this.groupForm.markAsPristine();
    this.groupForm.markAsUntouched();
  }

  loadGroupMembers() {
    if (!this.selectedGroupCode()) {
      return;
    }

    this.groupService.getGroupMembers(this.selectedGroupCode()).subscribe({
      next: (res) => {
        this.groupMembers.set(res);
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudieron cargar los miembros del grupo.');
      }
    });
  }

  updatePendingMember(user_id: number, accepted: boolean) {
    this.groupService.updatePendingMember(this.selectedGroupCode(), user_id, accepted).subscribe({
      next: () => {
        this.loadGroupMembers();
        this.showInfo(accepted ? 'Usuario aceptado correctamente.' : 'Solicitud rechazada correctamente.');
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo actualizar la solicitud.');
      }
    });
  }

  loadQRCode() {
    if (!this.selectedGroupCode()) {
      this.qrCodeUrl.set('');
      return;
    }

    toDataURL(this.joinUrlLong(), {
      width: 220,
      margin: 2,
    }).then((url) => {
      this.qrCodeUrl.set(url);
    }).catch(() => {
      this.qrCodeUrl.set('');
      this.showError('No se pudo generar el código QR.');
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
