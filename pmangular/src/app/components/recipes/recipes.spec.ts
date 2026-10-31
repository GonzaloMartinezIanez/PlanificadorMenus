import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Recipes } from './recipes';
import { defaultTestProviders } from '../../testing/test-providers';

describe('Recipes', () => {
  let component: Recipes;
  let fixture: ComponentFixture<Recipes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Recipes],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(Recipes);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the public recipe repository and invites visitors to sign in before creating recipes', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-recipe-search')).toBeTruthy();
    expect(element.textContent).toContain('Recetas públicas');
    expect(element.querySelector<HTMLAnchorElement>('[routerLink="/"]')).toBeTruthy();
    expect(element.querySelector('[routerLink="/recipes/create"]')).toBeNull();
  });
});
