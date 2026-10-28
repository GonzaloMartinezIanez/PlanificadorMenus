import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MenuService } from '../../services/menu.service';
import { MenuModel, ShortMenuModel } from '../../models/menu';
import { CalendarDay } from './calendar-day/calendar-day';
import { RealtimeService } from '../../services/realtime.service';
import { CalendarState } from '../../services/calendar-state.service';

@Component({
  selector: 'app-menus',
  providers: [CalendarState],
  imports: [MatButtonModule, MatSnackBarModule, CalendarDay],
  templateUrl: './menus.html',
  styleUrl: './menus.css',
})
export class Menus implements OnInit, AfterViewInit {
  @ViewChild('weekContainer') weekContainer?: ElementRef<HTMLElement>; // Hacer scroll al día actual

  route = inject(ActivatedRoute);
  menuService = inject(MenuService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private realtime = inject(RealtimeService);
  private midnightTimer?: ReturnType<typeof setTimeout>;
  private scrollTimer?: ReturnType<typeof setTimeout>;
  readonly state = inject(CalendarState);

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.midnightTimer);
      clearTimeout(this.scrollTimer);
    });
  }

  groupCode = signal<string | null>(null);
  menus = this.state.menus;
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
    this.realtime
      .watchGroup(
        () => this.groupCode(),
        ['menu.changed'],
        (event) => {
          const week = this.week();
          return (
            !event.date || (!!week && event.date >= this.formatDate(week[0]) && event.date <= this.formatDate(week[6]))
          );
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMenus(true));
    this.updateDayMidnight();
    this.week.set(this.generateWeek(this.thisMonday()));

    // Escuchar la url para el cambio de grupo
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (params) => {
        const groupCode = params.get('group_code');

        this.groupCode.set(groupCode);
        this.state.replace([]);
        if (!groupCode) {
          return;
        }

        this.loadMenus();
      },
    });
  }

  ngAfterViewInit(): void {
    this.scrollToToday();
  }

  loadMenus(background = false) {
    const groupCode = this.groupCode();
    const week = this.week();

    if (!groupCode || !week) {
      return;
    }

    this.state.load(groupCode, this.formatDate(week[0]), this.formatDate(week[6]), () => {
      if (!background && this.groupCode() === groupCode)
        this.showError('No se pudo cargar el calendario. Vuelve a intentarlo.');
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
    this.state.replace([]);
    this.loadMenus();
  }

  generatePreviousWeek() {
    const monday = this.week()?.[0];
    if (!monday) {
      return;
    }

    const previousMonday = new Date(monday);
    previousMonday.setDate(previousMonday.getDate() - 7);

    this.week.set(this.generateWeek(previousMonday));
    this.state.replace([]);
    this.loadMenus();
  }

  getMenusByDay(day: Date) {
    const formattedDay = this.formatDate(day);

    return this.menus().filter((menu) => menu.date === formattedDay);
  }

  isPastDay(day: Date) {
    return day.getTime() < this.todayStart().getTime();
  }

  isToday(day: Date) {
    return day.getTime() === this.todayStart().getTime();
  }

  scrollToToday() {
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      const todayElement = this.weekContainer?.nativeElement.querySelector<HTMLElement>('[data-current-day="true"]');

      todayElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });
  }

  addRecipeToMenu(event: MenuModel) {
    const groupCode = this.groupCode();

    if (!groupCode || event.date < this.formatDate(this.todayStart())) {
      return;
    }

    const menu: ShortMenuModel = {
      id_recipe: event.recipe.id,
      date: event.date,
      time: event.time,
    };

    this.menuService
      .postMenus(groupCode, menu)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadMenus();
        },
        error: () => {
          this.showError('No se pudo añadir la receta al menú. Vuelve a intentarlo.');
        },
      });
  }

  deleteRecipeFromMenu(event: ShortMenuModel) {
    const groupCode = this.groupCode();

    if (!groupCode || event.date < this.formatDate(this.todayStart())) {
      return;
    }

    const menu: ShortMenuModel = {
      id_recipe: event.id_recipe,
      date: event.date,
      time: event.time,
    };

    this.menuService
      .deleteMenus(groupCode, menu)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadMenus();
        },
        error: () => {
          this.showError('No se pudo quitar la receta del menú. Vuelve a intentarlo.');
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
    clearTimeout(this.midnightTimer);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilTomorrow = tomorrow.getTime() - now.getTime();

    // Actualizar el día a las 24:00 y programar para pasado mañana
    this.midnightTimer = setTimeout(() => {
      const previousMonday = this.thisMonday();
      this.today.set(new Date());
      // Avanzar la semana actual, conservando la consulta de semanas históricas.
      const monday = this.week()?.[0];
      if (monday && monday.getTime() === previousMonday.getTime() && monday.getTime() < this.thisMonday().getTime()) {
        this.week.set(this.generateWeek(this.thisMonday()));
        this.state.replace([]);
        this.loadMenus();
      }
      this.updateDayMidnight();
    }, msUntilTomorrow);
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-error'],
    });
  }
}
