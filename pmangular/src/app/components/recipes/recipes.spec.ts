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
});
