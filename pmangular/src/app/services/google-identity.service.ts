import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { GoogleCredentialResponse, GoogleIdentityApi } from '../models/google-identity';

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private loading?: Promise<void>;
  private initializedApi?: GoogleIdentityApi;
  private credentialHandler?: (response: GoogleCredentialResponse) => void;

  // Las pantallas comparten la descarga, también durante la navegación.
  load(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (this.loading) return this.loading;

    this.loading = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
      const script = existing ?? document.createElement('script');
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        clearTimeout(timeout);
        script.removeEventListener('load', checkReady);
        script.removeEventListener('error', onError);
        if (error) {
          script.remove();
          reject(error);
        } else {
          resolve();
        }
      };
      const checkReady = () => {
        if (window.google?.accounts?.id) finish();
      };
      const onError = () => finish(new Error('Google Identity Services no se pudo cargar.'));
      const poll = setInterval(checkReady, 100);
      const timeout = setTimeout(() => finish(new Error('Google Identity Services no está disponible.')), 5000);
      script.addEventListener('load', checkReady);
      script.addEventListener('error', onError);
      if (!existing) {
        script.src = SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      checkReady();
    }).catch((error: unknown) => {
      this.loading = undefined;
      throw error;
    });
    return this.loading;
  }

  renderButton(container: HTMLElement, handler: (response: GoogleCredentialResponse) => void): () => void {
    const api = window.google?.accounts?.id;
    if (!api) throw new Error('Google Identity Services no está disponible.');

    this.credentialHandler = handler;
    // La configuración de Google es global: reinicializarla sustituye su callback.
    if (this.initializedApi !== api) {
      api.initialize({
        client_id: environment.googleClientId,
        callback: (response) => this.credentialHandler?.(response),
      });
      this.initializedApi = api;
    }
    container.replaceChildren();
    api.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      type: 'standard',
      text: 'signin_with',
      width: 280,
    });
    return () => {
      if (this.credentialHandler === handler) this.credentialHandler = undefined;
    };
  }
}
