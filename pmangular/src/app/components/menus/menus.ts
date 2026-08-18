import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MenuService } from '../../services/menu.service';
import { MenuModel, ShortMenuModel } from '../../models/menu';
import { CalendarDay } from './calendar-day/calendar-day';
import { Recipe } from '../../models/recipe';

@Component({
  selector: 'app-menus',
  imports: [MatButtonModule, CalendarDay],
  templateUrl: './menus.html',
  styleUrl: './menus.css',
})
export class Menus implements OnInit {
  route = inject(ActivatedRoute);
  menuService = inject(MenuService);

  groupCode = signal<string | null>(null);
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
    // Si hoy es: lunes 0, martes -1 ... domingo -6
    const numDays = day === 0 ? -6 : 1 - day;

    return new Date(date.setDate(date.getDate() + numDays));
  });
  week = signal<Date[] | null>(null);

  ngOnInit(): void {
    this.updateDayMidnight();
    this.week.set(this.generateWeek(this.thisMonday()));

    // Escuchar la url para el cambio de grupo
    this.route.paramMap.subscribe({
      next: (params) => {
        const groupCode = params.get('group_code');

        if (!groupCode) {
          return;
        }

        this.groupCode.set(groupCode);
        this.loadMenus();
      },
    });
  }

  loadMenus() {
    const groupCode = this.groupCode();

    if (!groupCode) {
      return;
    }

    this.menuService.getMenus(groupCode).subscribe({
      next: (menus) => {
        this.menus.set(menus);
      },
    });
  }

  generateWeek(monday: Date): Date[] {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
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

  getMenusByDay(day: Date) {
    const formattedDay = this.formatDate(day);

    return this.menus().filter((menu) => menu.date === formattedDay);
  }

  isPastDay(day: Date) {
    return day.getTime() < this.todayStart().getTime();
  }

  addRecipeToMenu(event: MenuModel) {
    const groupCode = this.groupCode();

    if (!groupCode) {
      return;
    }

    const menu: ShortMenuModel = {
      id_recipe: event.recipe.id,
      date: event.date,
      time: event.time,
    };

    this.menuService.postMenus(groupCode, menu).subscribe({
      next: () => {
        this.loadMenus();
      },
    });
  }

  deleteRecipeFromMenu(event: ShortMenuModel) {
    const groupCode = this.groupCode();

    if (!groupCode) {
      return;
    }

    const menu: ShortMenuModel = {
      id_recipe: event.id_recipe,
      date: event.date,
      time: event.time,
    };

    this.menuService.deleteMenus(groupCode, menu).subscribe({
      next: () => {
        this.loadMenus();
      },
    });
  }

  formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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
