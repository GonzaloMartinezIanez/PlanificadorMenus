import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AbstractControl, ValidationErrors } from '@angular/forms';

export function validProductAmount(value: number | null): value is number {
  return (
    value !== null &&
    Number.isFinite(value) &&
    value >= 0.001 &&
    value <= 9999999.999 &&
    Math.abs(value * 1000 - Math.round(value * 1000)) < 0.000001
  );
}

export function productAmountValidator(control: AbstractControl): ValidationErrors | null {
  return validProductAmount(control.value) ? null : { productAmount: true };
}

export function productUnit(unit: string): string {
  return unit === 'ud' ? 'unidades' : ['dc', 'dz'].includes(unit) ? 'docenas' : unit === 'lv' ? 'lavados' : unit;
}

@Component({
  selector: 'app-product-quantity',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <label class="quantity-label" [attr.for]="quantityInput.id">Cantidad necesaria ({{ unitLabel }})</label>
    <div class="quantity-control">
      <button
        mat-icon-button
        type="button"
        aria-label="Restar un envase"
        [disabled]="disabled || !canDecrease"
        (click)="adjust(-1)"
      >
        <mat-icon>remove</mat-icon>
      </button>
      <mat-form-field>
        <input
          matInput
          #amountInput
          #quantityInput="matInput"
          inputmode="decimal"
          [value]="value ?? ''"
          [disabled]="disabled"
          (input)="read($event)"
          (keydown)="onKey($event)"
        />
      </mat-form-field>
      <button
        mat-icon-button
        type="button"
        aria-label="Añadir un envase"
        [disabled]="disabled || !step || (value ?? 0) + step > 9999999.999"
        (click)="adjust(1)"
      >
        <mat-icon>add</mat-icon>
      </button>
    </div>
    <p class="quantity-hint">
      {{
        step
          ? 'Un envase: ' + format(step) + ' ' + unitLabel
          : 'Contenido del envase desconocido. Introduce la cantidad manualmente.'
      }}
    </p>
    @if (value !== null && !valid(value)) {
      <p class="error-message">Introduce una cantidad positiva con un máximo de tres decimales.</p>
    }
  `,
  styleUrl: './product-quantity.css',
})
export class ProductQuantity {
  @ViewChild('amountInput') private amountInput?: ElementRef<HTMLInputElement>;
  focus(): void {
    this.amountInput?.nativeElement.focus();
  }
  @Input() value: number | null = null;
  @Input() unit = '';
  @Input() packageAmount: number | string | null | undefined;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<number | null>();
  @Output() submitted = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  valid = validProductAmount;
  get unitLabel(): string {
    return productUnit(this.unit);
  }
  get step(): number | null {
    const n = Number(this.packageAmount);
    return validProductAmount(n) ? n : null;
  }
  get canDecrease(): boolean {
    return this.step !== null && this.value !== null && Math.round((this.value - this.step) * 1000) >= 1;
  }
  format(value: number): string {
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(value);
  }
  read(event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim().replace(',', '.');
    const number = Number(text);
    this.valueChange.emit(text && Number.isFinite(number) ? number : null);
  }
  adjust(direction: number): void {
    if (!this.step || (direction < 0 && !this.canDecrease)) return;
    const next = Math.round(((this.value ?? 0) + direction * this.step) * 1000) / 1000;
    if (validProductAmount(next)) this.valueChange.emit(next);
  }
  onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.adjust(event.key === 'ArrowUp' ? 1 : -1);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitted.emit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancelled.emit();
    }
  }
}
