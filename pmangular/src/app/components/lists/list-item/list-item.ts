import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ListModel, ListPatchItem, ListStatusItem } from '../../../models/lists';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-list-item',
  imports: [NgStyle, MatIconModule],
  templateUrl: './list-item.html',
  styleUrl: './list-item.css',
})
export class ListItem {
  @Input() item : ListModel | null = null;
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
}
