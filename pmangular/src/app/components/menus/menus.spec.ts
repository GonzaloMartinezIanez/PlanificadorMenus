import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, vi } from 'vitest';

import { Menus } from './menus';
import { defaultTestProviders } from '../../testing/test-providers';
import { MenuModel } from '../../models/menu';
import { RealtimeEvent } from '../../models/realtime';
import { RealtimeService } from '../../services/realtime.service';

describe('Menus', () => {
  let component: Menus;
  let fixture: ComponentFixture<Menus>;
  let http: HttpTestingController;
  let routeParams: Subject<ParamMap>;
  const snackBar = { open: vi.fn() };

  beforeEach(async () => {
    snackBar.open.mockClear();
    routeParams = new Subject<ParamMap>();
    await TestBed.configureTestingModule({
      imports: [Menus],
      providers: [
        ...defaultTestProviders,
        { provide: MatSnackBar, useValue: snackBar },
        { provide: ActivatedRoute, useValue: { paramMap: routeParams } },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();

    fixture = TestBed.createComponent(Menus);
    component = fixture.componentInstance;
    component.week.set(component.generateWeek(component.thisMonday()));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('refreshes remote changes without clearing the displayed calendar and stops when leaving', () => {
    const events = new Subject<RealtimeEvent>();
    vi.spyOn(TestBed.inject(RealtimeService), 'watchGroup').mockReturnValue(events);
    component.ngOnInit();
    component.groupCode.set('GROUP001');
    const displayed: MenuModel[] = [{ recipe: { id: 1 } as MenuModel['recipe'], date: '2026-10-28', time: 'LUNCH' }];
    component.state.replace(displayed);
    events.next({ type: 'menu.changed', group_code: 'GROUP001' });
    expect(component.menus()).toEqual(displayed);
    http.expectOne((req) => req.url.includes('/menus/GROUP001/')).flush([]);
    expect(component.menus()).toEqual([]);
    fixture.destroy();
    events.next({ type: 'menu.changed', group_code: 'GROUP001' });
    http.expectNone((req) => req.url.includes('/menus/'));
  });

  it('requests the visible week and ignores a late response from the previous week', () => {
    component.groupCode.set('GROUP');
    component.loadMenus();
    const week = component.week()!;
    const old = http.expectOne(
      (req) =>
        req.params.get('from') === component.formatDate(week[0]) &&
        req.params.get('to') === component.formatDate(week[6]),
    );
    component.generateNextWeek();
    const current = http.expectOne((req) => req.params.get('from') === component.formatDate(component.week()![0]));
    const menus = [{ recipe: { id: 2 }, date: component.formatDate(component.week()![0]), time: 'LUNCH' }];
    current.flush(menus);
    old.flush([]);
    expect(component.menus()).toEqual(menus);
  });

  it('should generates seven consecutive days starting on Monday', () => {
    const week = component.generateWeek(new Date('2026-09-14T00:00:00'));

    expect(week).toHaveLength(7);
    expect(component.formatDate(week[0])).toBe('2026-09-14');
    expect(component.formatDate(week[6])).toBe('2026-09-20');
  });

  it('allows navigating backwards from the current week and loading its historical interval', () => {
    component.today.set(new Date('2026-09-19T12:00:00'));
    component.week.set(component.generateWeek(component.thisMonday()));

    component.groupCode.set('GROUP');
    component.generatePreviousWeek();
    expect(component.formatDate(component.week()![0])).toBe('2026-09-07');
    http.expectOne((req) => req.params.get('from') === '2026-09-07' && req.params.get('to') === '2026-09-13').flush([]);
  });

  it('should correctly identifies today and past days', () => {
    component.today.set(new Date('2026-09-19T12:00:00'));

    expect(component.isToday(new Date('2026-09-19T00:00:00'))).toBe(true);
    expect(component.isPastDay(new Date('2026-09-18T00:00:00'))).toBe(true);
  });

  it('should report a calendar loading error without discarding displayed menus', () => {
    component.groupCode.set('GROUP');
    const menus: MenuModel[] = [{ recipe: { id: 1 } as MenuModel['recipe'], date: '2026-09-19', time: 'LUNCH' }];
    component.state.replace(menus);

    component.loadMenus();
    http.expectOne((req) => req.method === 'GET').flush({}, { status: 500, statusText: 'Server error' });

    expect(component.menus()).toEqual(menus);
    expect(snackBar.open).toHaveBeenCalledWith(
      'No se pudo cargar el calendario. Vuelve a intentarlo.',
      'Cerrar',
      expect.any(Object),
    );
  });

  it.each(['POST', 'DELETE'])('should report a failed %s without reloading menus', (method) => {
    component.today.set(new Date('2026-09-19T12:00:00'));
    component.groupCode.set('GROUP');
    if (method === 'POST') {
      component.addRecipeToMenu({ recipe: { id: 1 } as MenuModel['recipe'], date: '2026-09-19', time: 'LUNCH' });
    } else {
      component.deleteRecipeFromMenu({ id_recipe: 1, date: '2026-09-19', time: 'LUNCH' });
    }
    http.expectOne((req) => req.method === method).flush({}, { status: 500, statusText: 'Server error' });

    expect(snackBar.open).toHaveBeenCalledWith(
      method === 'POST'
        ? 'No se pudo añadir la receta al menú. Vuelve a intentarlo.'
        : 'No se pudo quitar la receta del menú. Vuelve a intentarlo.',
      'Cerrar',
      expect.any(Object),
    );
    http.expectNone((req) => req.method === 'GET');
  });

  it('does not send add or remove requests for a past date', () => {
    component.today.set(new Date('2026-09-19T12:00:00'));
    component.groupCode.set('GROUP');
    component.addRecipeToMenu({ recipe: { id: 1 } as MenuModel['recipe'], date: '2026-09-18', time: 'LUNCH' });
    component.deleteRecipeFromMenu({ id_recipe: 1, date: '2026-09-18', time: 'LUNCH' });
    http.expectNone((req) => req.method === 'POST' || req.method === 'DELETE');
  });

  it('preserves a historical week when midnight starts a new current week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T23:59:59'));
    component.today.set(new Date());
    component.week.set(component.generateWeek(new Date('2026-09-07T00:00:00')));
    component.updateDayMidnight();
    vi.advanceTimersByTime(1000);
    expect(component.formatDate(component.week()![0])).toBe('2026-09-07');
    expect(component.formatDate(component.today())).toBe('2026-09-21');
  });

  it('should release timers, route subscriptions and pending requests on destruction', () => {
    vi.useFakeTimers();
    component.ngOnInit();
    component.scrollToToday();
    routeParams.next(convertToParamMap({ group_code: 'GROUP' }));
    const pendingRequest = http.expectOne((req) => req.url.endsWith('/menus/GROUP/'));

    fixture.destroy();
    routeParams.next(convertToParamMap({ group_code: 'OTHER' }));

    expect(vi.getTimerCount()).toBe(0);
    expect(pendingRequest.cancelled).toBe(true);
    expect(component.groupCode()).toBe('GROUP');
    http.expectNone((req) => req.url.endsWith('/menus/OTHER/'));
  });

  it('should ignore a response for a group that is no longer selected', () => {
    component.groupCode.set('FIRST');
    component.loadMenus();
    component.groupCode.set('SECOND');
    component.loadMenus();
    const currentMenus = [{ recipe: { id: 2 }, date: '2026-09-19', time: 'DINNER' }];
    http.expectOne((req) => req.url.endsWith('/menus/SECOND/')).flush(currentMenus);
    http.expectOne((req) => req.url.endsWith('/menus/FIRST/')).flush([]);

    expect(component.menus()).toEqual(currentMenus);
  });

  it('should advance to the new week at midnight on Monday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T23:59:59'));
    component.today.set(new Date());
    component.week.set(component.generateWeek(component.thisMonday()));
    component.updateDayMidnight();

    vi.advanceTimersByTime(1000);

    expect(component.formatDate(component.today())).toBe('2026-09-21');
    expect(component.formatDate(component.week()![0])).toBe('2026-09-21');
  });
});
