import { TestBed } from '@angular/core/testing';
import { ProductQuantity } from './product-quantity';

describe('ProductQuantity', () => {
  let control: ProductQuantity;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProductQuantity] });
    control = TestBed.createComponent(ProductQuantity).componentInstance;
  });
  it('adds and removes whole packs from the current manually entered amount without floating point drift', () => {
    control.packageAmount = '.2';
    control.value = 0.1;
    const amounts: (number | null)[] = [];
    control.valueChange.subscribe((value) => {
      amounts.push(value);
      control.value = value;
    });
    control.adjust(1);
    control.adjust(-1);
    control.adjust(-1);
    expect(amounts).toEqual([0.3, 0.1]);
  });
  it('does not turn an unknown pack into one unit or allow zero', () => {
    control.value = 0.5;
    const amounts: (number | null)[] = [];
    control.valueChange.subscribe((value) => amounts.push(value));
    control.adjust(1);
    expect(amounts).toEqual([]);
    control.packageAmount = 0.5;
    control.adjust(-1);
    expect(amounts).toEqual([]);
  });
  it('accepts a decimal comma and clears invalid input', () => {
    const values: (number | null)[] = [];
    control.valueChange.subscribe((value) => values.push(value));
    control.read({ target: { value: '0,25' } } as unknown as Event);
    control.read({ target: { value: 'abc' } } as unknown as Event);
    expect(values).toEqual([0.25, null]);
  });
});
