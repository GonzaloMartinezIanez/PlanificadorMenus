import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupOnboarding } from './group-onboarding';

describe('GroupOnboarding', () => {
  let component: GroupOnboarding;
  let fixture: ComponentFixture<GroupOnboarding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupOnboarding],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupOnboarding);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
