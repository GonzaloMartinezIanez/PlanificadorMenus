import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { AuthUser } from '../models/auth-user';
import { AuthResponse } from '../models/auth-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  private accessToken = signal<string | null>(localStorage.getItem(environment.ACCESS_TOKEN_KEY));
  private refreshToken = signal<string | null>(localStorage.getItem(environment.REFRESH_TOKEN_KEY));
  private user = signal<AuthUser | null>(this.loadStoredUser());

  currentUser = this.user.asReadonly();
  currentUserId = computed(() => this.user()?.id ?? null);
  isAuthenticated = computed(() => !!this.accessToken());

  getAccessToken(): string | null {
    return this.accessToken();
  }

  // Pasar el id que da google al backend para que compruebe que es correcto y devuelve
  // el access token, el refresh token y la información del usuario
  login(token: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/`, { token }).pipe(
      tap((response) => {
        this.accessToken.set(response.access);
        this.refreshToken.set(response.refresh);
        this.user.set(response.user);

        localStorage.setItem(environment.ACCESS_TOKEN_KEY, response.access);
        localStorage.setItem(environment.REFRESH_TOKEN_KEY, response.refresh);
        localStorage.setItem(environment.USER_KEY, JSON.stringify(response.user));
      }),
    );
  }

  refresh() {
    const refresh = this.refreshToken();

    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh/`, { refresh }).pipe(
      tap((res) => {
        // Comprobar que el refresh token es correcto y si lo es actualizar el access token y el refresh token
        if (!res.access || !res.refresh) {
          this.logout();
          return;
        }

        this.accessToken.set(res.access);
        this.refreshToken.set(res.refresh);

        localStorage.setItem(environment.ACCESS_TOKEN_KEY, res.access);
        localStorage.setItem(environment.REFRESH_TOKEN_KEY, res.refresh);
      })
    );
  }

  // Borra las cookies y pasa el refresh token al backend para que lo inhabilite
  logout() {
    if (this.accessToken() != null) {
      this.http.post(`${environment.apiUrl}/auth/logout/`, { "refresh": this.refreshToken() }).subscribe()
    }

    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.user.set(null);

    localStorage.removeItem(environment.ACCESS_TOKEN_KEY);
    localStorage.removeItem(environment.REFRESH_TOKEN_KEY);
    localStorage.removeItem(environment.USER_KEY);
  }

  // Saca el usuario guardado en localStorage
  private loadStoredUser(): AuthUser | null {
    const storedUser = localStorage.getItem(environment.USER_KEY);
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      localStorage.removeItem(environment.USER_KEY);
      return null;
    }
  }

  checkJWTExpired(): boolean {
    const token = this.accessToken()
    if (!token) {
      return true;
    }

    try {
      // JWT = cabecera.body.firma
      const jwtBody = JSON.parse(atob(token.split(".")[1])); // Con atob se decodifica el body
      const expiration_date = jwtBody.exp;

      // Dar un margen de 30 segundos para invalidar el token
      return Date.now() + 30000 >= expiration_date * 1000; // Pasar a milisegundos
    } catch {
      return true;
    }
  }
}
