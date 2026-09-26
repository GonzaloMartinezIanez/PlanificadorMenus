import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { Root } from './root';

describe('Root', () => {
  let component: Root;
  let fixture: ComponentFixture<Root>;
  const groupService = { getMyGroups: vi.fn() };
  const router = { navigate: vi.fn() };

  beforeEach(async () => {
    localStorage.clear();
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Root],
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: vi.fn().mockReturnValue(false) } },
        { provide: GroupService, useValue: groupService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Root);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirects to the first group when a session is stored', () => {
    localStorage.setItem(environment.ACCESS_TOKEN_KEY, 'token');
    groupService.getMyGroups.mockReturnValue(of([{ group_code: 'ABC12345' }]));

    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/home/ABC12345']);
  });

  it('should redirects to onboarding when the session has no groups', () => {
    localStorage.setItem(environment.ACCESS_TOKEN_KEY, 'token');
    groupService.getMyGroups.mockReturnValue(of([]));

    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['group-onboarding']);
  });
});
