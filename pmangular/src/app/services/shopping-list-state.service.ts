import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ListModel, ListResponse } from '../models/lists';
import { ListService } from './list.service';

@Injectable()
export class ShoppingListState {
  private readonly api = inject(ListService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly items = signal<ListModel[]>([]);
  private readonly price = signal(0);
  readonly list = this.items.asReadonly();
  readonly totalPrice = this.price.asReadonly();
  private requestId = 0;

  replace(response: ListResponse): void {
    ++this.requestId;
    this.items.set(response.items);
    this.price.set(response.total_price);
  }

  load(group: string, onLoaded: (response: ListResponse) => void, onError: () => void): void {
    const requestId = ++this.requestId;
    this.api
      .getLists(group)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;
          this.items.set(response.items);
          this.price.set(response.total_price);
          onLoaded(response);
        },
        error: () => {
          if (requestId === this.requestId) onError();
        },
      });
  }
}
