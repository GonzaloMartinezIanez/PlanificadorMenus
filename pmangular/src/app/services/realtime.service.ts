import { DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { auditTime, filter, firstValueFrom, fromEvent, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { RealtimeEvent, RealtimeEventType } from '../models/realtime';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly enabled = signal(false);
  private readonly connection = signal<'offline' | 'connecting' | 'connected' | 'reconnecting'>('offline');
  readonly status = this.connection.asReadonly();
  private readonly events = new Subject<RealtimeEvent>();
  readonly events$ = this.events.asObservable();
  private socket?: WebSocket;
  private groupCode: string | null = null;
  private generation = 0;
  private attempts = 0;
  private authFailures = 0;
  private lastPong = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private handshakeTimer?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      const active = this.enabled() && this.auth.isAuthenticated();
      untracked(() => {
        if (active) void this.connect();
        else this.stop();
      });
    });
    this.destroyRef.onDestroy(() => this.stop());
  }

  start(): void {
    if (this.enabled()) return;
    this.enabled.set(true);
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) route = route.firstChild;
        const path = route.routeConfig?.path ?? '';
        const code = path.endsWith('/join') ? null : route.paramMap.get('group_code');
        if (code !== this.groupCode) {
          this.groupCode = code;
          this.subscribeGroup();
        }
      });
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (
          (event.key === environment.ACCESS_TOKEN_KEY || event.key === null) &&
          !localStorage.getItem(environment.ACCESS_TOKEN_KEY)
        ) {
          this.auth.clearSession();
          void this.router.navigate(['/login']);
        }
      });
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.visibilityState === 'visible' && this.connection() === 'connected') {
          this.events.next({ type: 'resync' });
        }
      });
  }

  watchGroup(
    code: () => string | null,
    types: RealtimeEventType[],
    matches: (event: RealtimeEvent) => boolean = () => true,
  ) {
    return this.events$.pipe(
      filter(
        (event) =>
          (event.type === 'resync' && (!event.group_code || event.group_code === code())) ||
          (event.group_code === code() && types.includes(event.type)),
      ),
      filter(matches),
      auditTime(100),
    );
  }

  retry(): void {
    if (!this.auth.isAuthenticated()) return;
    this.stop();
    void this.connect();
  }

  refresh(): void {
    if (!this.auth.isAuthenticated()) return;
    this.events.next({ type: 'resync' });
    this.retry();
  }

  private async connect(forceRefresh = false): Promise<void> {
    const generation = ++this.generation;
    this.connection.set(this.attempts ? 'reconnecting' : 'connecting');
    try {
      if (forceRefresh || this.auth.checkJWTExpired()) await firstValueFrom(this.auth.refresh());
    } catch {
      if (generation !== this.generation) return;
      this.auth.clearSession();
      this.stop();
      void this.router.navigate(['/login']);
      return;
    }
    if (generation !== this.generation || !this.auth.isAuthenticated()) return;
    const url = new URL('../ws/events/', `${environment.apiUrl}/`);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    this.handshakeTimer = setTimeout(() => socket.close(), 10000);
    socket.onopen = () => socket.send(JSON.stringify({ type: 'authenticate', token: this.auth.getAccessToken() }));
    socket.onmessage = (message) => {
      if (generation !== this.generation) return;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }
      if (!data || typeof data !== 'object') return;
      if (data['type'] === 'ready') {
        clearTimeout(this.handshakeTimer);
        this.connection.set('connected');
        this.attempts = 0;
        this.authFailures = 0;
        this.lastPong = Date.now();
        this.subscribeGroup();
        this.events.next({ type: 'resync' });
        this.heartbeat = setInterval(() => {
          if (Date.now() - this.lastPong > 60000) socket.close();
          else this.send({ type: 'ping' });
        }, 25000);
      } else if (data['type'] === 'pong') {
        this.lastPong = Date.now();
      } else if (data['type'] === 'subscribed') {
        if (data['group_code'] === this.groupCode) this.events.next({ type: 'resync', group_code: this.groupCode });
      } else if (data['type'] === 'subscription.denied') {
        if (data['group_code'] === this.groupCode)
          this.events.next({ type: 'membership.revoked', group_code: this.groupCode });
      } else if (typeof data['group_code'] === 'string' && typeof data['type'] === 'string') {
        const types: RealtimeEventType[] = [
          'menu.changed',
          'shopping_list.changed',
          'membership.requested',
          'membership.decided',
          'membership.changed',
          'membership.revoked',
          'group.updated',
          'group.deleted',
        ];
        if (types.includes(data['type'] as RealtimeEventType)) this.events.next(data as unknown as RealtimeEvent);
      }
    };
    socket.onclose = (event) => {
      if (generation !== this.generation) return;
      clearTimeout(this.handshakeTimer);
      clearInterval(this.heartbeat);
      this.socket = undefined;
      if (event.code === 4401 && ++this.authFailures > 2) {
        this.auth.clearSession();
        void this.router.navigate(['/login']);
        return;
      }
      this.scheduleReconnect(event.code === 4401);
    };
    // El navegador comunica el detalle mediante close; se evita un error sin tratar.
    socket.onerror = () => {};
  }

  private scheduleReconnect(refresh = false): void {
    if (!this.enabled() || !this.auth.isAuthenticated()) return;
    this.connection.set('reconnecting');
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempts++, 5)) * (0.8 + Math.random() * 0.4);
    this.retryTimer = setTimeout(() => void this.connect(refresh), delay);
  }

  private subscribeGroup(): void {
    if (this.connection() === 'connected') this.send({ type: 'subscribe', group_code: this.groupCode });
  }

  private send(message: object): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private stop(): void {
    ++this.generation;
    clearTimeout(this.retryTimer);
    clearTimeout(this.handshakeTimer);
    clearInterval(this.heartbeat);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = undefined;
    }
    this.connection.set('offline');
  }
}
