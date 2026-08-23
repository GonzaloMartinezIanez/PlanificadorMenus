import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeCreate } from './recipe-create';
import { defaultTestProviders } from '../../../testing/test-providers';

describe('RecipeCreate', () => {
  let component: RecipeCreate;
  let fixture: ComponentFixture<RecipeCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeCreate],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeCreate);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
