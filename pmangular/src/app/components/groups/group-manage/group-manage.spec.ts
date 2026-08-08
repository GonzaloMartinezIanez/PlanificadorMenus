import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupManage } from './group-manage';

describe('GroupManage', () => {
  let component: GroupManage;
  let fixture: ComponentFixture<GroupManage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupManage],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupManage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
