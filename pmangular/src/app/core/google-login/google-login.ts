import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { GoogleCredentialResponse } from '../../models/google-identity';

@Component({
  selector: 'app-google-login',
  templateUrl: './google-login.html',
  styleUrl: './google-login.css',
})
export class GoogleLogin implements AfterViewInit {
  @ViewChild('googleButton', { static: true }) private googleButton!: ElementRef<HTMLDivElement>;

  authenticated = output<void>();
  loadingChange = output<boolean>();
  loginError = output<string>();

  protected busy = signal(false);
  private authService = inject(AuthService);
  private identity = inject(GoogleIdentityService);
  private destroyRef = inject(DestroyRef);
  private ngZone = inject(NgZone);
  private disconnect?: () => void;

  constructor() {
    this.destroyRef.onDestroy(() => this.disconnect?.());
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.identity.load();
      if (this.destroyRef.destroyed) return;
      this.disconnect = this.identity.renderButton(this.googleButton.nativeElement, (response) => {
        this.ngZone.run(() => this.handleCredential(response));
      });
    } catch {
      if (!this.destroyRef.destroyed) {
        this.ngZone.run(() => this.loginError.emit('No se pudo cargar Google Login.'));
      }
    }
  }

  private handleCredential(response: GoogleCredentialResponse): void {
    if (!response.credential || this.destroyRef.destroyed || this.busy()) return;
    this.busy.set(true);
    this.loadingChange.emit(true);
    this.authService
      .login(response.credential)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.ngZone.run(() => {
            this.busy.set(false);
            this.loadingChange.emit(false);
            this.authenticated.emit();
          }),
        error: () =>
          this.ngZone.run(() => {
            this.busy.set(false);
            this.loadingChange.emit(false);
            this.loginError.emit('No se pudo iniciar sesión con Google en el backend.');
          }),
      });
  }
}
