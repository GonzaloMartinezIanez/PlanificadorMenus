import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { finalize, of, Subject, throwError } from 'rxjs';
import { GoogleCredentialResponse } from '../../models/google-identity';
import { AuthService } from '../../services/auth.service';
import { GoogleIdentityService } from '../../services/google-identity.service';
import { GoogleLogin } from './google-login';

describe('GoogleLogin', () => {
  let fixture: ComponentFixture<GoogleLogin>;
  let callback: (response: GoogleCredentialResponse) => void;
  const disconnect = vi.fn();
  const identity = { load: vi.fn(), renderButton: vi.fn() };
  const auth = { login: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    identity.load.mockResolvedValue(undefined);
    identity.renderButton.mockImplementation((_container, handler) => {
      callback = handler;
      return disconnect;
    });
    auth.login.mockReturnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [GoogleLogin],
      providers: [
        { provide: GoogleIdentityService, useValue: identity },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GoogleLogin);
  });

  afterEach(() => fixture.destroy());

  async function renderButton() {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('exchanges credentials with the backend and emits authentication and loading events', async () => {
    const authenticated = vi.fn(),
      loading = vi.fn();
    fixture.componentInstance.authenticated.subscribe(authenticated);
    fixture.componentInstance.loadingChange.subscribe(loading);
    await renderButton();
    callback({ credential: 'example-token' });
    expect(auth.login).toHaveBeenCalledWith('example-token');
    expect(loading.mock.calls).toEqual([[true], [false]]);
    expect(authenticated).toHaveBeenCalledOnce();
  });

  it('reports a backend failure and allows another login attempt', async () => {
    const error = vi.fn(),
      authenticated = vi.fn();
    fixture.componentInstance.loginError.subscribe(error);
    fixture.componentInstance.authenticated.subscribe(authenticated);
    auth.login.mockReturnValueOnce(throwError(() => new Error('Backend unavailable')));
    await renderButton();
    callback({ credential: 'first' });
    expect(error).toHaveBeenCalledWith('No se pudo iniciar sesión con Google en el backend.');
    expect(authenticated).not.toHaveBeenCalled();
    callback({ credential: 'retry' });
    expect(authenticated).toHaveBeenCalledOnce();
  });

  it('reports a script load failure without sending a login request', async () => {
    identity.load.mockRejectedValueOnce(new Error('Script failed'));
    const error = vi.fn();
    fixture.componentInstance.loginError.subscribe(error);
    await renderButton();
    expect(error).toHaveBeenCalledWith('No se pudo cargar Google Login.');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('ignores empty credentials and duplicate callbacks during a pending login', async () => {
    auth.login.mockReturnValue(new Subject());
    await renderButton();
    callback({ credential: '' });
    callback({ credential: 'first' });
    callback({ credential: 'duplicate' });
    expect(auth.login).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes a pending backend request and disconnects its callback on destruction', async () => {
    const request = new Subject(),
      cancelled = vi.fn();
    auth.login.mockReturnValue(request.pipe(finalize(cancelled)));
    const authenticated = vi.fn();
    fixture.componentInstance.authenticated.subscribe(authenticated);
    await renderButton();
    callback({ credential: 'pending' });
    fixture.destroy();
    request.next({});
    callback({ credential: 'late' });
    expect(cancelled).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(authenticated).not.toHaveBeenCalled();
    expect(auth.login).toHaveBeenCalledTimes(1);
  });

  it('does not render a button when the screen is destroyed before the script loads', async () => {
    let resolve!: () => void;
    identity.load.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    fixture.detectChanges();
    fixture.destroy();
    resolve();
    await Promise.resolve();
    expect(identity.renderButton).not.toHaveBeenCalled();
  });
});
