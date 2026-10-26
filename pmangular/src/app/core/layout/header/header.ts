import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { GroupModel } from '../../../models/group';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { filter } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-header',
  imports: [MatSelectModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  authService = inject(AuthService);
  groupService = inject(GroupService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  myGroups = signal<GroupModel[]>([]);
  selectedGroupCode = signal(localStorage.getItem(environment.ACTIVE_GROUP_KEY) ?? '');
  isGroupRoute = signal(false);
  avatarFailed = signal(false);
  currentUser = this.authService.currentUser;
  userInitialLetter = computed(() => this.currentUser()?.username?.charAt(0).toUpperCase() ?? 'U');
  showGroupSelect = computed(() => this.isGroupRoute() && this.myGroups().length > 1);
  showAvatar = computed(() => !!this.currentUser()?.profile_picture && !this.avatarFailed());
  selectedGroup = computed(() => this.myGroups().find((group) => group.group_code === this.selectedGroupCode()));
  homeLink = computed(() => {
    if (!this.authService.isAuthenticated()) return ['/recipes'];
    return this.selectedGroupCode() ? ['/home', this.selectedGroupCode()] : ['/groups/access'];
  });
  navigationItems = computed(() => [
    {
      label: 'Calendario',
      description: 'Calendario semanal',
      icon: 'calendar_month',
      link: this.selectedGroupCode() ? ['/home', this.selectedGroupCode()] : ['/group-onboarding'],
    },
    {
      label: 'Lista de la compra',
      description: 'Lista de la compra',
      icon: 'shopping_basket',
      link: this.selectedGroupCode() ? ['/list', this.selectedGroupCode()] : ['/group-onboarding'],
    },
    { label: 'Recetas', description: 'Recetas', icon: 'menu_book', link: ['/recipes'] },
    { label: 'Crear/unirse', description: 'Crear o unirse a un grupo', icon: 'group_add', link: ['/groups/access'] },
  ]);

  ngOnInit(): void {
    // Guardar el código del grupo en selectedGroupCode
    this.updateSelectedGroupFromUrl();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updateSelectedGroupFromUrl();
      });

    this.loadMyGroups();
  }

  // Capta el parámetro group_code del parámetro de la url
  updateSelectedGroupFromUrl() {
    let currentRoute = this.route.root;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const groupCode = currentRoute.snapshot.paramMap.get('group_code');
    this.isGroupRoute.set(!!groupCode);

    if (groupCode) {
      this.selectedGroupCode.set(groupCode);
      localStorage.setItem(environment.ACTIVE_GROUP_KEY, groupCode);
    }
  }

  // Select para cambiar de grupo recarga la vista actual con el nuevo grupo
  loadMyGroups() {
    if (!this.authService.isAuthenticated()) {
      this.myGroups.set([]);
      return;
    }

    this.groupService
      .getMyGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          this.myGroups.set(groups);

          const selectedGroupExists = groups.some((group) => group.group_code === this.selectedGroupCode());

          if (!selectedGroupExists && groups.length > 0) {
            this.selectedGroupCode.set(groups[0].group_code);
            localStorage.setItem(environment.ACTIVE_GROUP_KEY, groups[0].group_code);
          } else if (groups.length === 0) {
            this.selectedGroupCode.set('');
            localStorage.removeItem(environment.ACTIVE_GROUP_KEY);
          }
        },
      });
  }

  changeGroup(groupCode: string) {
    const currentGroupCode = this.selectedGroupCode();

    if (!currentGroupCode || currentGroupCode === groupCode) {
      return;
    }

    this.selectedGroupCode.set(groupCode);
    localStorage.setItem(environment.ACTIVE_GROUP_KEY, groupCode);
    this.router.navigateByUrl(this.router.url.replace(`/${currentGroupCode}`, `/${groupCode}`));
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['']);
  }

  onAvatarError() {
    this.avatarFailed.set(true);
  }
}
