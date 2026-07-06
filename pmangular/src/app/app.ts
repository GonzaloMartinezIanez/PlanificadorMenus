import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit{
  protected readonly title = signal('Planificador de Menús');

  constructor(private http: HttpClient){}

  categories: any[] = [];

  ngOnInit(): void {
    this.http.get('http://127.0.0.1:8000/api/ingredient_categories/').subscribe((data) => {
      console.log(data)
      this.categories = data as any[];
    });
  }
}
