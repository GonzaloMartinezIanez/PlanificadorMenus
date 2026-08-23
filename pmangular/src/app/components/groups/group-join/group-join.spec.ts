import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupJoin } from './group-join';
import { defaultTestProviders } from '../../../testing/test-providers';

describe('GroupJoin', () => {
  let component: GroupJoin;
  let fixture: ComponentFixture<GroupJoin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupJoin],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(GroupJoin);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
