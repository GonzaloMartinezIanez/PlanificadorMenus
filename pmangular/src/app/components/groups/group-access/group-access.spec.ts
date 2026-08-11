import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAccess } from './group-access';

describe('GroupAccess', () => {
  let component: GroupAccess;
  let fixture: ComponentFixture<GroupAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupAccess],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupAccess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
