import { Component, ElementRef, inject, NgZone, OnInit, signal, ViewChild } from '@angular/core';
import { GroupService } from '../../../services/group.service';
import { AuthService } from '../../../services/auth.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-group-join',
  imports: [RouterLink, MatButtonModule, MatSnackBarModule],
  templateUrl: './group-join.html',
  styleUrl: './group-join.css',
})
export class GroupJoin implements OnInit {
  @ViewChild('googleButton', { static: false }) googleButton?: ElementRef<HTMLDivElement>;

  groupService = inject(GroupService);
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  ngZone = inject(NgZone);
  snackBar = inject(MatSnackBar);

  groupCode = signal('');
  isLoading = signal(false);
  hasRequestedJoin = signal(false);

  googleScript?: HTMLScriptElement;
  destroyed = false;

  ngOnInit(): void {
    const groupCode = this.route.snapshot.paramMap.get('group_code');

    if (groupCode) {
      this.groupCode.set(groupCode);
    }
  }

  async ngAfterViewInit() {
    if (this.authService.isAuthenticated()) {
      this.redirectIfAlreadyMember();
      return;
    }

    try {
      await this.loadGoogleIdentityScript();
      this.renderGoogleButton();
    } catch {
      this.showError('No se pudo cargar Google Login.');
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  joinGroup() {
    if (!this.authService.isAuthenticated()) {
      this.showError('Debes iniciar sesión para unirte al grupo.');
      return;
    }

    this.isLoading.set(true);

    this.groupService.joinGroup(this.groupCode()).subscribe({
      next: (res) => {
        this.showInfo(res.message);
        this.hasRequestedJoin.set(true);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.showError(err.error.error ?? 'No se pudo solicitar la unión al grupo.');
        this.isLoading.set(false);
      },
    });
  }

  private async handleGoogleCredential(response: GoogleCredentialResponse) {
    if (!response.credential || this.destroyed) {
      return;
    }

    this.ngZone.run(() => {
      this.isLoading.set(true);
    });

    this.authService.login(response.credential).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.joinAfterLogin();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.showError('No se pudo iniciar sesión con Google en el backend.');
          this.isLoading.set(false);
        });
      },
    });
  }

  checkAccepted() {
    const groupCode = this.groupCode();

    if (!groupCode) {
      return;
    }

    this.isLoading.set(true);

    this.groupService.getMyGroups().subscribe({
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

  private joinAfterLogin() {
    const groupCode = this.groupCode();

    if (!groupCode) {
      this.isLoading.set(false);
      this.showError('El enlace de invitación no es válido.');
      return;
    }

    this.groupService.getMyGroups().subscribe({
      next: (groups) => {
        const group = groups.find((item) => item.group_code === groupCode);

        if (group) {
          this.router.navigate(['/home', group.group_code]);
          return;
        }

        this.joinGroup();
      },
      error: () => {
        this.isLoading.set(false);
        this.showError('No se pudo comprobar el grupo al que quieres unirte.');
      },
    });
  }

  private redirectIfAlreadyMember() {
    const groupCode = this.groupCode();

    if (!groupCode) {
      return;
    }

    this.groupService.getMyGroups().subscribe({
      next: (groups) => {
        const group = groups.find((item) => item.group_code === groupCode);

        if (group) {
          this.router.navigate(['/home', group.group_code]);
        }
      },
    });
  }

  private async loadGoogleIdentityScript() {
    if (window.google?.accounts?.id) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      await this.waitForGoogleIdentity();
      return;
    }

    this.googleScript = document.createElement('script');
    this.googleScript.src = 'https://accounts.google.com/gsi/client';
    this.googleScript.async = true;
    this.googleScript.defer = true;

    const loaded = new Promise<void>((resolve, reject) => {
      this.googleScript!.onload = () => resolve();
      this.googleScript!.onerror = () => reject(new Error('Google script failed'));
    });

    document.head.appendChild(this.googleScript);
    await loaded;
    await this.waitForGoogleIdentity();
  }

  private async waitForGoogleIdentity() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (window.google?.accounts?.id) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error('Google Identity Services unavailable');
  }

  private renderGoogleButton() {
    const buttonContainer = this.googleButton?.nativeElement;
    if (!buttonContainer || !window.google?.accounts?.id) {
      return;
    }

    buttonContainer.innerHTML = '';

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) => {
        void this.handleGoogleCredential(response);
      },
    });

    window.google.accounts.id.renderButton(buttonContainer, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      type: 'standard',
      text: 'signin_with',
      width: 280,
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

  logout() {
    this.authService.logout();
  }
}
