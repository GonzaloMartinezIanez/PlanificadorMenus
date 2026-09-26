import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { IngredientService } from './ingredient.service';

describe('IngredientService', () => {
  let service: IngredientService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IngredientService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should get ingredient categories', () => {
    service.getIngredientCategories().subscribe();

    const request = http.expectOne(`${environment.apiUrl}/ingredient_categories/`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should get the ingredients by its category', () => {
    service.getIngredientsByCategory(29).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/ingredient_categories/29/ingredients/`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should get ingredients by name', () => {
    service.searchIngredientsByName('arroz con pollo').subscribe();

    const request = http.expectOne(`${environment.apiUrl}/ingredient_by_name/?name=arroz%20con%20pollo`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
