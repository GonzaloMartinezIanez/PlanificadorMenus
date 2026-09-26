import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ListService } from './list.service';

describe('ListService', () => {
  let service: ListService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ListService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should get the group\'s grocery list', () => {
    service.getLists('ABC123').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/lists/ABC123/`);
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], total_price: 0 });
  });

  it('should add a product to the grocery list', () => {
    const item = { id_ingredient: '10', amount: 2, unit: 'ud' };
    service.postListItem('ABC123', item).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/lists/ABC123/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(item);
    request.flush({ message: 'Creado' });
  });

  it('should change the amount of a product in the list', () => {
    service.changeAmountListItem('ABC123', '10', { amount: 2, unit: 'kg' }).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/lists/ABC123/10/`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ amount: 2, unit: 'kg' });
    request.flush({ message: 'Actualizado' });
  });

  it('should change the state of a product in the list', () => {
    service.changeStatusListItem('ABC123', '10', true).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/lists/ABC123/10/`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ bought: true });
    request.flush({ message: 'Actualizado' });
  });

  it('should clear the group\'s grocery list', () => {
    service.deleteList('ABC123').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/lists/ABC123/`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ message: 'Eliminada' });
  });
});
