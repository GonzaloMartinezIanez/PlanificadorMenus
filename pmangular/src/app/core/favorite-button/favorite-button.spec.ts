import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { FavoriteButton } from './favorite-button';
import { AuthService } from '../../services/auth.service';
import { defaultTestProviders } from '../../testing/test-providers';
import { environment } from '../../../environments/environment';

describe('FavoriteButton', () => {
  const auth = { isAuthenticated: signal(true), currentUserId: signal<number | null>(1) };
  const snackBar = { open: vi.fn() };

  function setup() {
    auth.isAuthenticated.set(true);
    auth.currentUserId.set(1);
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      imports: [FavoriteButton],
      providers: [
        ...defaultTestProviders,
        { provide: AuthService, useValue: auth },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    const fixture = TestBed.createComponent(FavoriteButton);
    fixture.componentRef.setInput('kind', 'ingredients');
    fixture.componentRef.setInput('itemId', '100.1');
    fixture.componentRef.setInput('name', 'Manzana');
    fixture.detectChanges();
    return { fixture, button: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
  }

  it('waits for confirmation, prevents duplicate requests and can remove a favorite', () => {
    const { fixture, button, http } = setup();
    button.favoriteChanged.subscribe((value) => fixture.componentRef.setInput('active', value));
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-pressed')).toBe('false');
    button.toggle();
    button.toggle();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    const add = http.expectOne(`${environment.apiUrl}/ingredients/100.1/favorite/`);
    expect(add.request.method).toBe('PUT');
    add.flush({ is_favorite: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').classList.contains('active')).toBe(true);
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-pressed')).toBe('true');
    button.toggle();
    const remove = http.expectOne(`${environment.apiUrl}/ingredients/100.1/favorite/`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ is_favorite: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').classList.contains('active')).toBe(false);
    http.verify();
  });

  it('preserves the state and explains failed writes', () => {
    const { button, http } = setup();
    const changed = vi.fn();
    button.favoriteChanged.subscribe(changed);
    button.toggle();
    http.expectOne(`${environment.apiUrl}/ingredients/100.1/favorite/`).flush({}, { status: 500, statusText: 'Error' });
    expect(button.saving()).toBe(false);
    expect(button.active).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalled();
    http.verify();
  });

  it('hides the control for guests and ignores responses from a previous account', () => {
    const { fixture, button, http } = setup();
    const changed = vi.fn();
    button.favoriteChanged.subscribe(changed);
    button.toggle();
    auth.currentUserId.set(2);
    http.expectOne(`${environment.apiUrl}/ingredients/100.1/favorite/`).flush({ is_favorite: true });
    expect(changed).not.toHaveBeenCalled();
    auth.isAuthenticated.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    button.toggle();
    http.verify();
  });
});
