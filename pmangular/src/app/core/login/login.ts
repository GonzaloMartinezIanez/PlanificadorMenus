import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { GoogleLogin } from '../google-login/google-login';

@Component({
  selector: 'app-login',
  imports: [MatChipsModule, GoogleLogin],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  authService = inject(AuthService);
  private groupService = inject(GroupService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  errorMessage = signal('');
  isLoading = signal(false);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) this.onAuthenticated();
  }

  onLoadingChange(loading: boolean): void {
    this.isLoading.set(loading);
    if (loading) this.errorMessage.set('');
  }

  onAuthenticated(): void {
    this.isLoading.set(true);
    this.groupService
      .getMyGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          this.isLoading.set(false);
          if (groups.length > 0) {
            const savedGroupCode = localStorage.getItem(environment.ACTIVE_GROUP_KEY);
            const selectedGroup = groups.find((group) => group.group_code === savedGroupCode) ?? groups[0];
            this.router.navigate([`/home/${selectedGroup.group_code}`]);
          } else {
            this.router.navigate(['/group-onboarding']);
          }
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los grupos del usuario.');
          this.isLoading.set(false);
        },
      });
  }
}
