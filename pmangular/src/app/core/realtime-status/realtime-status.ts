import { Component, inject } from '@angular/core';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-realtime-status',
  template: `
    @if (realtime.status() === 'reconnecting') {
      <aside role="status">
        <span>Actualización en tiempo real desconectada. Intentando reconectar…</span>
        <button type="button" (click)="realtime.refresh()">Actualizar datos</button>
      </aside>
    }
  `,
  styleUrl: './realtime-status.css',
})
export class RealtimeStatus {
  readonly realtime = inject(RealtimeService);
}
