import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ListModel, ListPatchItem, ListStatusItem } from '../../../models/lists';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-item',
  imports: [MatIconModule, MatButtonModule, MatInputModule, FormsModule],
  templateUrl: './list-item.html',
  styleUrl: './list-item.css',
})
export class ListItem {
  @Input() item: ListModel | null = null;
  @Output() changeItemStatus = new EventEmitter<ListStatusItem>();
  @Output() changeItemAmount = new EventEmitter<ListPatchItem>();

  editMode = signal(false);
  editedAmount = signal(0);

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
    this.editMode.set(true);
  }

  editAmount() {
    if (!this.item || this.editedAmount() < 0.001) {
      return;
    }

    this.changeItemAmount.emit({
      id_ingredient: this.item.ingredient.id_ingredient,
      amount: this.editedAmount(),
    });
    
    this.editMode.set(false);
  }
}
