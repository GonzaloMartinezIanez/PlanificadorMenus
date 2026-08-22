import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ListModel, ListStatusItem } from '../../../models/lists';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-list-item',
  imports: [NgStyle, MatIconModule],
  templateUrl: './list-item.html',
  styleUrl: './list-item.css',
})
export class ListItem {
  @Input() item: ListModel | null = null;
  @Output() changeItemStatus = new EventEmitter<ListStatusItem>();
  @Output() changeItemAmount = new EventEmitter<ListStatusItem>();

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
}
