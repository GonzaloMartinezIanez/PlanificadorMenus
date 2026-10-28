import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { App } from './app';
import { defaultTestProviders } from './testing/test-providers';

@Component({ template: '<p>Pantalla de acceso</p>' })
class LoginDestination {}

@Component({ template: '<p>Calendario semanal</p>' })
class CalendarDestination {}

describe('App', () => {
  let loginDecision: Subject<boolean | UrlTree>;
  let calendarDecision: Subject<boolean>;

  beforeEach(async () => {
    loginDecision = new Subject<boolean | UrlTree>();
    calendarDecision = new Subject<boolean>();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        ...defaultTestProviders,
        provideRouter([
          { path: 'login', component: LoginDestination, canActivate: [() => loginDecision] },
          { path: 'home', component: CalendarDestination, canActivate: [() => calendarDecision] },
        ]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('keeps the loading screen visible during checks and redirects until the destination opens', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')?.textContent).toContain('Preparando tu planificador');
    expect(element.querySelector('img')?.getAttribute('src')).toBe('logo.svg');

    const navigation = router.navigateByUrl('/login');
    await vi.waitFor(() => expect(loginDecision.observed).toBe(true));
    fixture.detectChanges();
    expect(element.querySelector('.startup-progress')).not.toBeNull();
    expect(element.textContent).not.toContain('Pantalla de acceso');

    loginDecision.next(router.parseUrl('/home'));
    await vi.waitFor(() => expect(calendarDecision.observed).toBe(true));
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')).not.toBeNull();
    expect(element.textContent).not.toContain('Pantalla de acceso');

    calendarDecision.next(true);
    await navigation;
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.textContent).toContain('Calendario semanal');
  });

  it('replaces the loading screen with login when there is no session', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    const navigation = router.navigateByUrl('/login');
    await vi.waitFor(() => expect(loginDecision.observed).toBe(true));
    loginDecision.next(true);
    await navigation;
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.textContent).toContain('Pantalla de acceso');
  });

  it('keeps the current screen while later navigations are pending', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    const firstNavigation = router.navigateByUrl('/home');
    await vi.waitFor(() => expect(calendarDecision.observed).toBe(true));
    calendarDecision.next(true);
    await firstNavigation;
    fixture.detectChanges();

    const navigation = router.navigateByUrl('/login');
    await vi.waitFor(() => expect(loginDecision.observed).toBe(true));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.textContent).toContain('Calendario semanal');

    loginDecision.next(true);
    await navigation;
    fixture.detectChanges();
    expect(element.textContent).toContain('Pantalla de acceso');
  });
});
