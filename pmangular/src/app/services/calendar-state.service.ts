import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuModel } from '../models/menu';
import { MenuService } from './menu.service';

@Injectable()
export class CalendarState {
  private readonly api = inject(MenuService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = signal<MenuModel[]>([]);
  readonly menus = this.data.asReadonly();
  private requestId = 0;

  replace(menus: MenuModel[]): void {
    ++this.requestId;
    this.data.set(menus);
  }

  load(group: string, from: string, to: string, onError: () => void): void {
    const requestId = ++this.requestId;
    this.api
      .getMenus(group, from, to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (menus) => {
          if (requestId === this.requestId) this.data.set(menus);
        },
        error: () => {
          if (requestId === this.requestId) onError();
        },
      });
  }
}
