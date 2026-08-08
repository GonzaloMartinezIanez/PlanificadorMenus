import { Component, ElementRef, inject, NgZone, OnInit, signal, ViewChild } from '@angular/core';
import { GroupService } from '../../../services/group.service';
import { AuthService } from '../../../services/auth.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

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
  selector: 'app-group-join',
  imports: [RouterLink],
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

  groupCode = signal('');
  errorMessage = signal('');
  infoMessage = signal('');
  isLoading = signal(false);

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

  joinGroup() {
    if (!this.authService.isAuthenticated()) {
      this.errorMessage.set('Debes iniciar sesión para unirte al grupo.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.infoMessage.set('');

    this.groupService.joinGroup(this.groupCode()).subscribe({
      next: (res) => {
        this.infoMessage.set(res.message);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error.error);
        this.isLoading.set(false);
      }
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
        this.ngZone.run(() => {
          this.isLoading.set(false);
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.errorMessage.set('No se pudo iniciar sesión con Google en el backend.');
          this.isLoading.set(false);
        });
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
}
