import { ComponentFixture, TestBed } from '@angular/core/testing';
import {Layout} from "./layout"
import { defaultTestProviders } from '../../testing/test-providers';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
