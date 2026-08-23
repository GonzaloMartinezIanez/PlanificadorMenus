import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Menus } from './menus';
import { defaultTestProviders } from '../../testing/test-providers';

describe('Menus', () => {
  let component: Menus;
  let fixture: ComponentFixture<Menus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Menus],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(Menus);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
