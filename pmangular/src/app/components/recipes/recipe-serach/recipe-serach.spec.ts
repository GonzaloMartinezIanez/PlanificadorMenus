import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeSerach } from './recipe-serach';

describe('RecipeSerach', () => {
  let component: RecipeSerach;
  let fixture: ComponentFixture<RecipeSerach>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeSerach],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeSerach);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
