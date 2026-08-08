import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupJoin } from './group-join';

describe('GroupJoin', () => {
  let component: GroupJoin;
  let fixture: ComponentFixture<GroupJoin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupJoin],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupJoin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
