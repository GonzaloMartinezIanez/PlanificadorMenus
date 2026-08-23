import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RecipeSearch } from './recipe-search';
import { RecipeService } from '../../../services/recipe.service';

describe('RecipeSerach', () => {
  let component: RecipeSearch;
  let fixture: ComponentFixture<RecipeSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeSearch],
      providers: [
        {
          provide: RecipeService,
          useValue: {
            getRecipesCategories: () => of([]),
            getTopRecipes: () => of([]),
            searchRecipes: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeSearch);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
