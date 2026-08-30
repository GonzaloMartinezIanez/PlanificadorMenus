import { Component, inject, OnInit } from '@angular/core';
import { GroupService } from '../../../services/group.service';
import { Router } from '@angular/router';
import { GroupForms } from '../group-forms/group-forms';
import { AuthService } from '../../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-group-onboarding',
  imports: [GroupForms, MatButtonModule],
  templateUrl: './group-onboarding.html',
  styleUrl: './group-onboarding.css',
})
export class GroupOnboarding implements OnInit {
  groupService = inject(GroupService);
  router = inject(Router);
  authService = inject(AuthService);

  ngOnInit(): void {
    this.checkAccepted();
  }

  checkAccepted() {
    this.groupService.getMyGroups().subscribe({
      next: (res) => {
        if (res.length > 0) this.router.navigate([`/home/${res[0].group_code}`]);
      },
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate([`/login`]);
  }
}
