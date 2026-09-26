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

  it('should shows full, half, or empty stars based on the score', () => {
    component.score = 3.5;

    expect(component.getStarIcon(3)).toBe('star');
    expect(component.getStarIcon(4)).toBe('star_half');
    expect(component.getStarIcon(5)).toBe('star_border');
  });

  it('should emits a score only in editable mode', () => {
    const scores: number[] = [];
    component.scoreChange.subscribe((score) => scores.push(score));

    component.selectScore(4);
    component.editable = true;
    component.selectScore(5);

    expect(scores).toEqual([5]);
  });

  it('should prioritizes the score under the cursor', () => {
    component.score = 1;
    component.setHoveredScore(4);

    expect(component.getStarIcon(4)).toBe('star');
    component.clearHoveredScore();
    expect(component.getStarIcon(4)).toBe('star_border');
  });
});
