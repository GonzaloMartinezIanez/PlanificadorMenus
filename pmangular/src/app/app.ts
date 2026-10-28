import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RealtimeService } from './services/realtime.service';
import { RealtimeStatus } from './core/realtime-status/realtime-status';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RealtimeStatus],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    inject(RealtimeService).start();
  }
  protected readonly isStarting = signal(true);
}
