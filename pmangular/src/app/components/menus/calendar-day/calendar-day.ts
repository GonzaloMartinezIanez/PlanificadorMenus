import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuModel } from '../../../models/menu';
import { Recipe } from '../../../models/recipe';
import { DayMealtime } from './day-mealtime/day-mealtime';


@Component({
  selector: 'app-calendar-day',
  imports: [CommonModule, DayMealtime],
  templateUrl: './calendar-day.html',
  styleUrl: './calendar-day.css',
})
export class CalendarDay {
  @Input() menus: MenuModel[] = [];
  @Input() day: Date | null = null;

  @Output() addRecipe = new EventEmitter<{ date: string; time: string; recipe: Recipe }>();
  @Output() deleteRecipe = new EventEmitter<{ date: string; time: string; id_recipe: number }>();

  formatDayText(day: Date) {
    return day.toLocaleDateString('es-ES', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  getMenusByTime(time: string) {
    return this.menus.filter((menu) => menu.time === time);
  }

  onRecipeSelected(event: { recipe: Recipe; time: string }) {
    if (!this.day) {
      return;
    }

    this.addRecipe.emit({
      date: this.formatDate(this.day),
      time: event.time,
      recipe: event.recipe,
    });
  }

  onDeleteRecipe(event: { id_recipe: number; time: string }) {
    if (!this.day) {
      return;
    }

    this.deleteRecipe.emit({
      date: this.formatDate(this.day),
      time: event.time,
      id_recipe: event.id_recipe,
    });
  }

  formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
