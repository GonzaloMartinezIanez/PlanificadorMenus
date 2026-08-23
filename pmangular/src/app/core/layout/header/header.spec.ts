import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Header } from './header';
import { defaultTestProviders } from '../../../testing/test-providers';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
