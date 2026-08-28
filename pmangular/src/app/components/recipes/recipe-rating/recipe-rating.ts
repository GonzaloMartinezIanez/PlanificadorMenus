import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-recipe-rating',
  imports: [MatIconModule],
  templateUrl: './recipe-rating.html',
  styleUrl: './recipe-rating.css',
})
export class RecipeRating {
  @Input() score = 0; // Si está en modo editable debe ser el score del usuario
  @Input() num_valorations = 0;
  @Input() editable = false;
  @Output() scoreChange = new EventEmitter<number>();

  stars = [1, 2, 3, 4, 5];
  hoveredScore = 0;

  // Devuelve los tres tipos de iconos de angular material
  getStarIcon(star: number) {
    // Si estás pasando por encima de una estrella en modo editable se sobrescribe score
    const score = this.hoveredScore || this.score;
    const roundedScore = Math.round(score * 2) / 2;

    if (roundedScore >= star) {
      return 'star';
    }

    if (roundedScore >= star - 0.5) {
      return 'star_half';
    }

    return 'star_border';
  }

  selectScore(score: number) {
    if (this.editable) {
      this.scoreChange.emit(score);
    }
  }

  setHoveredScore(score: number) {
    this.hoveredScore = score;
  }

  clearHoveredScore() {
    this.hoveredScore = 0;
  }
}
