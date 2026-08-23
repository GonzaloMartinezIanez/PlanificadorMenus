import { ComponentFixture, TestBed } from '@angular/core/testing';

import { List } from "./list"
import { defaultTestProviders } from '../../testing/test-providers';

describe('List', () => {
  let component: List;
  let fixture: ComponentFixture<List>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [List],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(List);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
