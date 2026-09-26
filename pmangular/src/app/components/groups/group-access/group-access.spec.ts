import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { GroupAccess } from './group-access';
import { GroupForms } from '../group-forms/group-forms';

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

  it('should pass the group access texts to the form', () => {
    const groupForms = fixture.debugElement.query(By.directive(GroupForms)).componentInstance as GroupForms;

    expect(groupForms.title).toBe('Crear o unirse a un grupo');
    expect(groupForms.subtitle).toBe('Puedes crear otro grupo o solicitar unirte a uno existente');
  });
});
