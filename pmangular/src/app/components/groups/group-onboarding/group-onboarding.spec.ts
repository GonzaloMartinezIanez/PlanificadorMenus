import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupOnboarding } from './group-onboarding';
import { defaultTestProviders } from '../../../testing/test-providers';

describe('GroupOnboarding', () => {
  let component: GroupOnboarding;
  let fixture: ComponentFixture<GroupOnboarding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupOnboarding],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(GroupOnboarding);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
