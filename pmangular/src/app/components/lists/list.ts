import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ListService } from '../../services/list.service';
import { ListModel, ListStatusItem } from '../../models/lists';
import { ListItem } from './list-item/list-item';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-list',
  imports: [ListItem, MatButtonModule],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List implements OnInit {
  route = inject(ActivatedRoute);
  listService = inject(ListService);

  groupCode = signal<string | null>(null);
  list = signal<ListModel[]>([]);

  ngOnInit(): void {
    // Escuchar la url para el cambio de grupo
    this.route.paramMap.subscribe({
      next: (params) => {
        const groupCode = params.get('group_code');

        if (!groupCode) {
          return;
        }

        this.groupCode.set(groupCode);
      },
    });

    this.loadList();
  }

  loadList() {
    this.listService.getLists(this.groupCode() || '').subscribe({
      next: (items) => {
        this.list.set(items);
      },
    });
  }

  deleteList() {
    this.listService.deleteList(this.groupCode() || '').subscribe({
      next: () => {
        this.loadList();
      },
    });
  }

  changeItemStatus(event: ListStatusItem) {
    this.listService
      .changeStatusListItem(this.groupCode() || '', event.id_ingredient, event.bought)
      .subscribe({
        next: () => {
          this.loadList();
        },
      });
  }
}
