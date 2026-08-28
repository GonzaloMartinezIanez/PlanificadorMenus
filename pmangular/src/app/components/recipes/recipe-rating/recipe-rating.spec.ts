import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeRating } from './recipe-rating';

describe('RecipeRating', () => {
  let component: RecipeRating;
  let fixture: ComponentFixture<RecipeRating>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeRating],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeRating);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
