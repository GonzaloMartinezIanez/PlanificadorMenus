import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupManage } from './group-manage';
import { defaultTestProviders } from '../../../testing/test-providers';

describe('GroupManage', () => {
  let component: GroupManage;
  let fixture: ComponentFixture<GroupManage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupManage],
      providers: defaultTestProviders,
    }).compileComponents();

    fixture = TestBed.createComponent(GroupManage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
