import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeDetail } from './recipe-detail';
import { defaultTestProviders } from '../../../testing/test-providers';

describe('RecipeDetail', () => {
  let component: RecipeDetail;
  let fixture: ComponentFixture<RecipeDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeDetail],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeDetail);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
