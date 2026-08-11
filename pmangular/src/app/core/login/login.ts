import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';

// Modelos que usa google
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
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-login',
  imports: [CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit, OnDestroy {
  // Boton para abrir el popup de iniciar sesion con google
  @ViewChild('googleButton', { static: true }) googleButton?: ElementRef<HTMLDivElement>;

  authService = inject(AuthService);
  groupService = inject(GroupService);
  router = inject(Router);
  errorMessage = signal('');
  isLoading = signal(false);

  readonly ngZone = inject(NgZone);
  googleScript?: HTMLScriptElement;
  destroyed = false;

  async ngAfterViewInit() {
    if (this.authService.isAuthenticated()) {
      this.redirectAuthenticatedUser();
      return;
    }

    try {
      await this.loadGoogleIdentityScript();
      this.renderGoogleButton();
    } catch {
      this.errorMessage.set('No se pudo cargar Google Login.');
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  // Se carga la lógica para iniciar sesión desde un script de google
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

  // Esperar a tener respuesta de google, si tarda mucho mostrar un error
  private async waitForGoogleIdentity() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (window.google?.accounts?.id) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error('Google Identity Services unavailable');
  }

  // Mostrar el boton de google
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

  private async handleGoogleCredential(response: GoogleCredentialResponse) {
    if (!response.credential || this.destroyed) {
      return;
    }

    this.ngZone.run(() => {
      this.isLoading.set(true);
      this.errorMessage.set('');
    });

    this.authService.login(response.credential).subscribe({
      next: () => {
        this.redirectAuthenticatedUser();
      },
      error: () => {
        this.ngZone.run(() => {
          this.errorMessage.set('No se pudo iniciar sesion con Google en el backend.');
          this.isLoading.set(false);
        });
      },
    });
  }

  private redirectAuthenticatedUser() {
    this.groupService.getMyGroups().subscribe({
      next: (groups) => {
        this.ngZone.run(() => {
          this.isLoading.set(false);

          if (groups.length > 0) {
            this.router.navigate([`/home/${groups[0].group_code}`]);
          } else {
            this.router.navigate(['/group-onboarding']);
          }
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.errorMessage.set('No se pudieron cargar los grupos del usuario.');
          this.isLoading.set(false);
        });
      },
    });
  }
}
