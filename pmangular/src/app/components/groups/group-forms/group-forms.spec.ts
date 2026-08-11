import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupForms } from './group-forms';

describe('GroupForms', () => {
  let component: GroupForms;
  let fixture: ComponentFixture<GroupForms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupForms],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupForms);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
