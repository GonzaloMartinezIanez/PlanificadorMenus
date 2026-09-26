import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;
  let http: HttpTestingController;
  const menu = { id_recipe: 4, date: '2026-09-19', time: 'LUNCH' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MenuService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should get menus from group', () => {
    service.getMenus('ABC123').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/menus/ABC123/`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should add recipe to menu date', () => {
    service.postMenus('ABC123', menu).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/menus/ABC123/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(menu);
    request.flush({ recipe: {}, date: menu.date, time: menu.time });
  });

  it('should remove a recipe from a menu', () => {
    service.deleteMenus('ABC123', menu).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/menus/ABC123/`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual(menu);
    request.flush({ message: 'Eliminada' });
  });
});
