import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListModel } from '../../../models/lists';
import { ListItem } from './list-item';

describe('ListItem', () => {
  let component: ListItem;
  let fixture: ComponentFixture<ListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListItem],
    }).compileComponents();

    fixture = TestBed.createComponent(ListItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit the product state change', () => {
    component.item = {
      ingredient: { id_ingredient: '1', name: 'Huevos' },
      amount: 2,
      unit: 'ud',
      bought: false,
    } as ListModel;
    let emittedStatus: unknown;
    component.changeItemStatus.subscribe((value) => (emittedStatus = value));

    component.change(true);

    expect(emittedStatus).toEqual({ id_ingredient: '1', bought: true });
  });

  it('should edits a valid amount and formats units', () => {
    component.item = {
      ingredient: { id_ingredient: '1', name: 'Huevos' },
      amount: 2,
      unit: 'ud',
      bought: false,
    } as ListModel;
    let emittedAmount: unknown;
    component.changeItemAmount.subscribe((value) => (emittedAmount = value));

    component.startEdit();
    component.editedAmount.set(3);
    component.editAmount();

    expect(emittedAmount).toEqual({ id_ingredient: '1', amount: 3 });
    expect(component.editMode()).toBe(false);
    expect(component.formatUnit()).toBe('unidades');
  });
});
