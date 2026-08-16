import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { MenuModel } from '../../models/menu';
import { MatAnchor } from '@angular/material/button';

@Component({
  selector: 'app-menus',
  imports: [MatAnchor],
  templateUrl: './menus.html',
  styleUrl: './menus.css',
})
export class Menus implements OnInit {
  route = inject(ActivatedRoute);
  menuService = inject(MenuService);

  menus = signal<MenuModel[]>([]);
  today = signal(new Date());
  todayStart = computed(() => {
    const date = new Date(this.today());
    date.setHours(0, 0, 0, 0);
    return date;
  });
  thisMonday = computed(() => {
    const date = new Date(this.today());
    date.setHours(0, 0, 0, 0);

    // Hay que tener en cuenta que: Domingo = 0, Lunes = 1, Martes = 2...
    const day = date.getDay();
    const numDays = day === 0 ? -6 : 1 - day; // Si hoy es: lunes 0, martes -1 ... domingo -6

    return new Date(date.setDate(date.getDate() + numDays));
  });
  week = signal<Date[] | null>(null);

  ngOnInit(): void {
    this.updateDayMidnight(); // Cambiar this.today() a las 24:00

    const groupCode = this.route.snapshot.paramMap.get('group_code');

    if (!groupCode) {
      return;
    }

    this.menuService.getMenus(groupCode).subscribe({
      next: (menus) => {
        this.menus.set(menus);
      },
    });

    this.week.set(this.generateWeek(this.thisMonday()));
  }

  generateWeek(monday: Date): Date[] {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    return days;
  }

  generateNextWeek() {
    const sunday = this.week()?.[6];
    if (!sunday) {
      return;
    }

    const nextMonday = new Date(sunday);
    nextMonday.setDate(nextMonday.getDate() + 1);

    this.week.set(this.generateWeek(nextMonday));
  }

  generatePreviousWeek() {
    const monday = this.week()?.[0];
    if (!monday) {
      return;
    }

    const previousMonday = new Date(monday);
    previousMonday.setDate(previousMonday.getDate() - 7);

    this.week.set(this.generateWeek(previousMonday));
  }

  // No permitir ir a semanas anteriores
  canGoToPreviousWeek() {
    const monday = this.week()?.[0];

    if (!monday) {
      return false;
    }

    return monday.getTime() > this.thisMonday().getTime();
  }

  updateDayMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilTomorrow = tomorrow.getTime() - now.getTime();

    // Actualizar el día a las 24:00 y programar para pasado mañana
    setTimeout(() => {
      this.today.set(new Date());
      this.updateDayMidnight();
    }, msUntilTomorrow);
  }
}
