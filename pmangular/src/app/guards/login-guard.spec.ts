import { Component } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { routes } from '../app.routes';
import { Login } from '../core/login/login';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import { GoogleIdentityService } from '../services/google-identity.service';

@Component({ template: '<p>Calendario</p>' })
class CalendarDestination {}

@Component({ template: '<p>Crear o unirse a un grupo</p>' })
class OnboardingDestination {}

describe('login route', () => {
  let http: HttpTestingController;
  const identity = { load: vi.fn(), renderButton: vi.fn() };

  function storeSession(expired = false) {
    const exp = Math.floor(Date.now() / 1000) + (expired ? -3600 : 3600);
    const token = `header.${btoa(JSON.stringify({ exp }))}.signature`;
    localStorage.setItem(environment.ACCESS_TOKEN_KEY, token);
    localStorage.setItem(environment.REFRESH_TOKEN_KEY, 'refresh-token');
  }

  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    identity.load.mockResolvedValue(undefined);
    identity.renderButton.mockReturnValue(vi.fn());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          routes.find((route) => route.path === 'login')!,
          { path: 'home/:group_code', component: CalendarDestination },
          { path: 'group-onboarding', component: OnboardingDestination },
        ]),
        { provide: GoogleIdentityService, useValue: identity },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows login without querying groups when there is no session', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', Login);
    http.expectNone(`${environment.apiUrl}/groups/`);
    expect(identity.load).toHaveBeenCalled();
  });

  it.each([
    { savedGroup: 'SAVED', destination: 'SAVED' },
    { savedGroup: 'REMOVED', destination: 'FIRST' },
    { savedGroup: null, destination: 'FIRST' },
  ])('opens $destination without rendering login (saved group: $savedGroup)', async ({ savedGroup, destination }) => {
    storeSession();
    if (savedGroup) localStorage.setItem(environment.ACTIVE_GROUP_KEY, savedGroup);
    const loginInit = vi.spyOn(Login.prototype, 'ngOnInit');
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/login', CalendarDestination);
    const request = await vi.waitFor(() => http.expectOne(`${environment.apiUrl}/groups/`));

    expect(loginInit).not.toHaveBeenCalled();
    expect(identity.load).not.toHaveBeenCalled();
    expect(harness.routeNativeElement).toBeNull();
    request.flush([{ group_code: 'FIRST' }, { group_code: 'SAVED' }]);
    await navigation;

    expect(TestBed.inject(Router).url).toBe(`/home/${destination}`);
    expect(loginInit).not.toHaveBeenCalled();
    expect(identity.load).not.toHaveBeenCalled();
  });

  it('opens onboarding without showing login when the user has no groups', async () => {
    storeSession();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/login', OnboardingDestination);
    const request = await vi.waitFor(() => http.expectOne(`${environment.apiUrl}/groups/`));
    request.flush([]);
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/group-onboarding');
    expect(identity.load).not.toHaveBeenCalled();
  });

  it('renews an expired token before opening the calendar', async () => {
    storeSession(true);
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/login', CalendarDestination);
    const refresh = await vi.waitFor(() => http.expectOne(`${environment.apiUrl}/auth/refresh/`));
    expect(harness.routeNativeElement).toBeNull();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const access = `header.${btoa(JSON.stringify({ exp }))}.signature`;
    refresh.flush({ access, refresh: 'new-refresh-token' });
    const groups = http.expectOne(`${environment.apiUrl}/groups/`);
    expect(groups.request.headers.get('Authorization')).toBe(`Bearer ${access}`);
    groups.flush([{ group_code: 'FIRST' }]);
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/home/FIRST');
    expect(identity.load).not.toHaveBeenCalled();
  });

  it('shows login when the saved session cannot be renewed', async () => {
    storeSession(true);
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/login', Login);
    const refresh = await vi.waitFor(() => http.expectOne(`${environment.apiUrl}/auth/refresh/`));
    refresh.flush({}, { status: 401, statusText: 'Unauthorized' });
    const groups = http.expectOne(`${environment.apiUrl}/groups/`);
    expect(groups.request.headers.has('Authorization')).toBe(false);
    groups.flush({}, { status: 401, statusText: 'Unauthorized' });
    await navigation;
    expect(localStorage.getItem(environment.ACCESS_TOKEN_KEY)).toBeNull();
    expect(identity.load).toHaveBeenCalled();
  });

  it('allows login to display a group loading error instead of blocking navigation', async () => {
    storeSession();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/login', Login);
    const request = await vi.waitFor(() => http.expectOne(`${environment.apiUrl}/groups/`));
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    const login = await navigation;
    http.expectOne(`${environment.apiUrl}/groups/`).flush({}, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(login.errorMessage()).toBe('No se pudieron cargar los grupos del usuario.');
    expect(harness.routeNativeElement?.textContent).toContain('No se pudieron cargar los grupos del usuario.');
  });
});
