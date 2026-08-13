import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeSearchResult } from './recipe-search-result';

describe('RecipeSearchResult', () => {
  let component: RecipeSearchResult;
  let fixture: ComponentFixture<RecipeSearchResult>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeSearchResult],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeSearchResult);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
