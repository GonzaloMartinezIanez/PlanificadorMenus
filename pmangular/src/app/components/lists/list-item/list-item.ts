import { Component, EventEmitter, Input, Output, signal, OnChanges } from '@angular/core';
import { ListModel, ListPatchItem, ListStatusItem, ListItemSaveResult } from '../../../models/lists';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProductQuantity, validProductAmount } from '../../ingredients/product-quantity/product-quantity';

@Component({
  selector: 'app-list-item',
  imports: [MatIconModule, MatButtonModule, MatTooltipModule, MatCheckboxModule, ProductQuantity],
  templateUrl: './list-item.html',
  styleUrl: './list-item.css',
})
export class ListItem implements OnChanges {
  @Input() item: ListModel | null = null;
  @Input() deleting = false;
  @Input() saving = false;
  @Input() saveResult?: ListItemSaveResult;
  private lastResult?: ListItemSaveResult;
  @Output() removeItem = new EventEmitter<string>();
  @Output() changeItemStatus = new EventEmitter<ListStatusItem>();
  @Output() changeItemAmount = new EventEmitter<ListPatchItem>();

  editMode = signal(false);
  editedAmount = signal<number | null>(null);
  conflict = signal(false);
  saveFailed = signal(false);
  private originalAmount = 0;
  validAmount = validProductAmount;

  ngOnChanges(): void {
    if (this.saveResult && this.saveResult !== this.lastResult) {
      this.lastResult = this.saveResult;
      if (this.editMode()) {
        if (this.saveResult.success) this.editMode.set(false);
        this.saveFailed.set(!this.saveResult.success);
      }
    }
    if (this.editMode() && this.item && this.item.amount !== this.originalAmount) this.conflict.set(true);
  }

  useCurrent(): void {
    this.startEdit();
  }

  remove() {
    if (this.item && !this.deleting) this.removeItem.emit(this.item.ingredient.id_ingredient);
  }

  change(bought: boolean) {
    if (!this.item) {
      return;
    }

    this.changeItemStatus.emit({
      id_ingredient: this.item.ingredient.id_ingredient,
      bought: bought,
    });
  }

  formatUnit() {
    if (!this.item) {
      return '';
    }

    const unit = this.item.unit.toLowerCase();
    const isSingular = this.item.amount === 1;

    if (unit === 'ud') {
      return isSingular ? 'unidad' : 'unidades';
    }

    // Tanto dc como dz representan docenas
    if (unit === 'dc' || unit === 'dz') {
      return isSingular ? 'docena' : 'docenas';
    }

    return this.item.unit;
  }

  getItemPrice() {
    return this.item?.calculated_price ?? null;
  }

  startEdit() {
    if (!this.item) {
      return;
    }

    this.editedAmount.set(this.item?.amount);
    this.originalAmount = this.item.amount;
    this.conflict.set(false);
    this.saveFailed.set(false);
    this.editMode.set(true);
  }

  editAmount() {
    const amount = this.editedAmount();
    if (!this.item || !validProductAmount(amount) || this.conflict() || this.saving) {
      return;
    }

    this.changeItemAmount.emit({
      id_ingredient: this.item.ingredient.id_ingredient,
      amount,
      expected_amount: this.originalAmount,
    });
  }
}
