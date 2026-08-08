import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { GroupService } from '../../../services/group.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { GroupMember, GroupModel } from '../../../models/group';
import { filter } from 'rxjs';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-group-manage',
  imports: [MatTableModule],
  templateUrl: './group-manage.html',
  styleUrl: './group-manage.css',
})
export class GroupManage implements OnInit{
  groupService = inject(GroupService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  displayedColumns: string[] = ['username', 'role', 'accepted', 'joining_date'];

  myGroups = signal<GroupModel[]>([]);
  selectedGroupCode = signal('');
  selectedGroup = computed<GroupModel | undefined>(() => this.myGroups().find(g => g.group_code === this.selectedGroupCode()));
  groupMembers = signal<GroupMember[]>([]);

  ngOnInit(): void {
    this.updateSelectedGroupFromUrl();

    // Detectar cada vez que se cambia la url y cambiar selectedGroupCode
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSelectedGroupFromUrl();
    });

    // Carga todos los grupos a los que pertenece el usuario
    this.groupService.getMyGroups().subscribe({
      next: (groups) => {
        this.myGroups.set(groups);
      }
    });

    this.groupService.getGroupMembers(this.selectedGroupCode()).subscribe({
      next: (res) => {
        this.groupMembers.set(res);
      }
    })
  }

  // Capta group_code del parámetro de la url
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


}
