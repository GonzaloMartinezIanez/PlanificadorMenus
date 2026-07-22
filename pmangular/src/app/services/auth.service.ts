import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { AuthUser } from '../models/auth-user';
import { AuthResponse } from '../models/auth-response';
import { environment } from '../../environments/environment';

// Nombre de la clave almacenada en localStorage
const ACCESS_TOKEN_KEY = 'pm_access_token';
const REFRESH_TOKEN_KEY = 'pm_refresh_token';
const USER_KEY = 'pm_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  private accessToken = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private refreshToken = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  private user = signal<AuthUser | null>(this.loadStoredUser());

  currentUser = this.user.asReadonly();
  currentUserId = computed(() => this.user()?.id ?? null);
  isAuthenticated = computed(() => !!this.accessToken());

  // Pasar el id que da google al backend para que compruebe que es correcto y devuelve
  // el access token, el refresh token y la información del usuario
  login(token: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/`, { token }).pipe(
      tap((response) => {
        this.accessToken.set(response.access);
        this.refreshToken.set(response.refresh);
        this.user.set(response.user);

        localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      }),
    );
  }

  // Borra las cookies y pasa el refresh token al backend para que lo inhabilite
  logout() {
    if(this.accessToken() != null){
      this.http.post(`${environment.apiUrl}/auth/logout/`, {"refresh": this.refreshToken()})
    }
    
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.user.set(null);

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Saca el usuario guardado en localStorage
  private loadStoredUser(): AuthUser | null {
    const storedUser = localStorage.getItem(USER_KEY);
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
