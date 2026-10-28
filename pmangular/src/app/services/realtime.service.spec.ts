import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';

class TestSocket {
  static OPEN = 1;
  static instances: TestSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
  });
  constructor(readonly url: URL) {
    TestSocket.instances.push(this);
  }
  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  disconnect(code = 1006): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

describe('RealtimeService', () => {
  const auth = {
    isAuthenticated: signal(true),
    getAccessToken: vi.fn(),
    checkJWTExpired: vi.fn(),
    refresh: vi.fn(),
    clearSession: vi.fn(),
  };
  const navigation = new Subject<NavigationEnd>();
  const root = { routeConfig: { path: 'home/:group_code' }, paramMap: convertToParamMap({ group_code: 'GROUP001' }) };
  const router = { events: navigation, routerState: { snapshot: { root } }, navigate: vi.fn() };
  let service: RealtimeService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    TestSocket.instances = [];
    vi.stubGlobal('WebSocket', TestSocket);
    auth.isAuthenticated.set(true);
    auth.getAccessToken.mockReturnValue('access-token');
    auth.checkJWTExpired.mockReturnValue(false);
    auth.refresh.mockReturnValue(of({ access: 'renewed' }));
    auth.clearSession.mockImplementation(() => auth.isAuthenticated.set(false));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(RealtimeService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function start(): TestSocket {
    service.start();
    TestBed.tick();
    const socket = TestSocket.instances[0];
    socket.open();
    socket.receive({ type: 'ready' });
    return socket;
  }

  it('shares one connection and authenticates in the first message without a token in the URL', () => {
    const socket = start();
    service.start();
    expect(TestSocket.instances).toHaveLength(1);
    expect(socket.url.pathname).toBe('/ws/events/');
    expect(socket.url.search).toBe('');
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'authenticate', token: 'access-token' }));
    expect(service.status()).toBe('connected');
  });

  it('does not open a socket for anonymous users', () => {
    auth.isAuthenticated.set(false);
    service.start();
    TestBed.tick();
    expect(TestSocket.instances).toHaveLength(0);
  });

  it('switches the group subscription after navigation and confirms it before resync', () => {
    const socket = start();
    const events = vi.fn();
    service.events$.subscribe(events);
    navigation.next(new NavigationEnd(1, '/home/GROUP001', '/home/GROUP001'));
    expect(socket.send).toHaveBeenLastCalledWith(JSON.stringify({ type: 'subscribe', group_code: 'GROUP001' }));
    socket.receive({ type: 'subscribed', group_code: 'OLDGROUP' });
    expect(events).not.toHaveBeenCalled();
    socket.receive({ type: 'subscribed', group_code: 'GROUP001' });
    expect(events).toHaveBeenCalledWith({ type: 'resync', group_code: 'GROUP001' });
  });

  it('coalesces relevant events and ignores another group or an irrelevant calendar date', () => {
    const socket = start();
    const refresh = vi.fn();
    service
      .watchGroup(
        () => 'GROUP001',
        ['menu.changed'],
        (event) => event.date === '2026-10-28',
      )
      .subscribe(refresh);
    socket.receive({ type: 'menu.changed', group_code: 'OTHER001', date: '2026-10-28' });
    socket.receive({ type: 'menu.changed', group_code: 'GROUP001', date: '2026-10-28' });
    socket.receive({ type: 'menu.changed', group_code: 'GROUP001', date: '2026-10-29' });
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.calls[0][0].date).toBe('2026-10-28');
  });

  it('reconnects and requests current data after a lost connection', async () => {
    const socket = start();
    const events = vi.fn();
    service.events$.subscribe(events);
    socket.disconnect();
    expect(service.status()).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1300);
    expect(TestSocket.instances).toHaveLength(2);
    const replacement = TestSocket.instances[1];
    replacement.open();
    replacement.receive({ type: 'ready' });
    expect(events).toHaveBeenCalledWith({ type: 'resync' });
  });

  it('renews the token when the server closes an expired session', async () => {
    const socket = start();
    socket.disconnect(4401);
    await vi.advanceTimersByTimeAsync(1300);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(TestSocket.instances).toHaveLength(2);
  });

  it('closes the socket and cancels reconnection when signing out', async () => {
    const socket = start();
    socket.disconnect();
    auth.isAuthenticated.set(false);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(60000);
    expect(TestSocket.instances).toHaveLength(1);
    expect(service.status()).toBe('offline');
  });

  it('closes a live socket on logout and ignores its late messages', () => {
    const socket = start();
    const events = vi.fn();
    service.events$.subscribe(events);
    auth.isAuthenticated.set(false);
    TestBed.tick();
    expect(socket.close).toHaveBeenCalled();
    socket.receive({ type: 'shopping_list.changed', group_code: 'GROUP001' });
    expect(events).not.toHaveBeenCalled();
  });

  it('synchronizes logout from another tab', () => {
    start();
    localStorage.removeItem(environment.ACCESS_TOKEN_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: environment.ACCESS_TOKEN_KEY, newValue: null }));
    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
