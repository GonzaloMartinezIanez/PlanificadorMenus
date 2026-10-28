import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
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
      .getInitialRoute()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (commands) => {
          this.isLoading.set(false);
          this.router.navigate(commands);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los grupos del usuario.');
          this.isLoading.set(false);
        },
      });
  }
}
