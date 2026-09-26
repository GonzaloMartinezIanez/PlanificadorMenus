import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should save user info after login', () => {
    const response = {
      access: 'access-token',
      refresh: 'refresh-token',
      user: { id: 7, username: 'Gonzalo', profile_picture: null },
    };
    service.login('google-token').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/auth/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: 'google-token' });
    request.flush(response);

    expect(service.getAccessToken()).toBe(response.access);
    expect(service.currentUserId()).toBe(7);
    expect(localStorage.getItem(environment.REFRESH_TOKEN_KEY)).toBe(response.refresh);
  });

  it('should refresh token', () => {
    const loginResponse = {
      access: 'old-access',
      refresh: 'old-refresh',
      user: { id: 7, username: 'Gonzalo', profile_picture: null },
    };
    service.login('google-token').subscribe();
    http.expectOne(`${environment.apiUrl}/auth/`).flush(loginResponse);

    service.refresh().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/auth/refresh/`);
    expect(request.request.body).toEqual({ refresh: 'old-refresh' });
    request.flush({ ...loginResponse, access: 'new-access', refresh: 'new-refresh' });

    expect(service.getAccessToken()).toBe('new-access');
    expect(localStorage.getItem(environment.REFRESH_TOKEN_KEY)).toBe('new-refresh');
  });

  it('should share a single refresh request', () => {
    service.login('google-token').subscribe();
    http.expectOne(`${environment.apiUrl}/auth/`).flush({
      access: 'old-access',
      refresh: 'old-refresh',
      user: { id: 7, username: 'Gonzalo', profile_picture: null },
    });

    service.refresh().subscribe();
    service.refresh().subscribe();

    const request = http.expectOne(`${environment.apiUrl}/auth/refresh/`);
    request.flush({ access: 'new-access', refresh: 'new-refresh' });

    expect(service.getAccessToken()).toBe('new-access');
  });

  it('should clear localstorage and send logout to backend', () => {
    const response = {
      access: 'access-token',
      refresh: 'refresh-token',
      user: { id: 7, username: 'Gonzalo', profile_picture: null },
    };
    service.login('google-token').subscribe();
    http.expectOne(`${environment.apiUrl}/auth/`).flush(response);

    service.logout();
    const request = http.expectOne(`${environment.apiUrl}/auth/logout/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ refresh: 'refresh-token' });
    request.flush({});

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(environment.USER_KEY)).toBeNull();
  });
});
