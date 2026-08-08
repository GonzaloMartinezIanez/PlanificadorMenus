import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { GroupService } from '../../../services/group.service';
import { GroupModel } from '../../../models/group';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule, MatToolbarModule, MatSelectModule, MatFormFieldModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  authService = inject(AuthService);
  groupService = inject(GroupService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  myGroups = signal<GroupModel[]>([]);
  selectedGroupCode = signal('');
  currentUser = this.authService.currentUser;
  userInitialLetter = computed(() => this.currentUser()?.username?.charAt(0).toUpperCase() ?? 'U');

  ngOnInit(): void {
    // Guardar el código del grupo en selectedGroupCode
    this.updateSelectedGroupFromUrl();

    // Detectar cada vez que se cambia la url y cambiar selectedGroupCode
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSelectedGroupFromUrl();
    });

    // Carga todos los grupos a los que pertenece el usuario (para el select)
    this.groupService.getMyGroups().subscribe({
      next: (groups) => {
        this.myGroups.set(groups);
      }
    });
  }

  // Capta el parámetro group_code del parámetro de la url
  updateSelectedGroupFromUrl() {
    let currentRoute = this.route.root;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const groupCode = currentRoute.snapshot.paramMap.get('group_code');
    if (groupCode) {
      this.selectedGroupCode.set(groupCode);
    }
  }

  // Select para cambiar de grupo recarga la vista actual con el nuevo grupo
  changeGroup(groupCode: string) {
    const currentGroupCode = this.selectedGroupCode();

    if (!currentGroupCode || currentGroupCode === groupCode) {
      return;
    }

    this.selectedGroupCode.set(groupCode);
    this.router.navigateByUrl(this.router.url.replace(`/${currentGroupCode}`, `/${groupCode}`));
  }

  logout() {
    this.authService.logout();
    this.router.navigate([''])
  }
}
