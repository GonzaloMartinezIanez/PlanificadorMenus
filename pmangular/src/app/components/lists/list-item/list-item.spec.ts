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

  it('retains a draft but blocks overwriting a remotely updated quantity until reviewed', () => {
    component.item = { ingredient: { id_ingredient: '1' }, amount: 2, unit: 'kg' } as ListModel;
    component.startEdit();
    component.editedAmount.set(3);
    component.item = { ...component.item, amount: 4 };
    component.ngOnChanges();
    expect(component.conflict()).toBe(true);
    expect(component.editedAmount()).toBe(3);
    let saved = false;
    component.changeItemAmount.subscribe(() => (saved = true));
    component.editAmount();
    expect(saved).toBe(false);
    component.useCurrent();
    expect(component.editedAmount()).toBe(4);
    expect(component.conflict()).toBe(false);
  });

  it('emits the product identifier for complete removal and prevents repeated deletion', () => {
    component.item = { ingredient: { id_ingredient: '10.1' }, amount: 7, unit: 'kg', bought: true } as ListModel;
    const ids: string[] = [];
    component.removeItem.subscribe((id) => ids.push(id));
    component.remove();
    component.deleting = true;
    component.remove();
    expect(ids).toEqual(['10.1']);
  });

  it('should emit the product state change', () => {
    fixture.componentRef.setInput('item', {
      ingredient: { id_ingredient: '1', name: 'Huevos' },
      amount: 2,
      unit: 'ud',
      bought: false,
    } as ListModel);
    let emittedStatus: unknown;
    component.changeItemStatus.subscribe((value) => (emittedStatus = value));

    component.change(true);

    expect(emittedStatus).toEqual({ id_ingredient: '1', bought: true });
  });

  it('toggles the product when its row is clicked without intercepting its actions', () => {
    fixture.componentRef.setInput('item', {
      ingredient: { id_ingredient: '1', name: 'Huevos' },
      amount: 2,
      unit: 'ud',
      bought: false,
    } as ListModel);
    const statusChanges: unknown[] = [];
    component.changeItemStatus.subscribe((value) => statusChanges.push(value));
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    const rowToggle = nativeElement.querySelector('.shopping-list-item-toggle') as HTMLLabelElement;
    rowToggle.click();
    expect(statusChanges).toEqual([{ id_ingredient: '1', bought: true }]);

    const editButton = Array.from(nativeElement.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Editar',
    ) as HTMLButtonElement;
    editButton.click();
    expect(component.editMode()).toBe(true);
    expect(statusChanges).toHaveLength(1);

    const deleteButton = nativeElement.querySelector('.shopping-list-item-delete') as HTMLButtonElement;
    deleteButton.click();
    expect(statusChanges).toHaveLength(1);
  });

  it('does not change the state while the product is being saved or deleted', () => {
    fixture.componentRef.setInput('item', {
      ingredient: { id_ingredient: '1', name: 'Huevos' },
      amount: 2,
      unit: 'ud',
      bought: false,
    } as ListModel);
    fixture.componentRef.setInput('saving', true);
    let statusChanges = 0;
    component.changeItemStatus.subscribe(() => statusChanges++);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    (nativeElement.querySelector('.shopping-list-item-toggle') as HTMLLabelElement).click();
    expect(statusChanges).toBe(0);

    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('deleting', true);
    fixture.detectChanges();
    (nativeElement.querySelector('.shopping-list-item-toggle') as HTMLLabelElement).click();
    expect(statusChanges).toBe(0);
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

    expect(emittedAmount).toEqual({ id_ingredient: '1', amount: 3, expected_amount: 2 });
    expect(component.editMode()).toBe(true);
    component.saveResult = { success: false };
    component.ngOnChanges();
    expect(component.editedAmount()).toBe(3);
    expect(component.editMode()).toBe(true);
    component.saveResult = { success: true };
    component.ngOnChanges();
    expect(component.editMode()).toBe(false);
    expect(component.formatUnit()).toBe('unidades');
  });
});
