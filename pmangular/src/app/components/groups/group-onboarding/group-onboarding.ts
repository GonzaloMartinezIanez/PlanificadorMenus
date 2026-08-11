import { Component, inject, OnInit } from '@angular/core';
import { GroupService } from '../../../services/group.service';
import { Router } from '@angular/router';
import { GroupForms } from '../group-forms/group-forms';

@Component({
  selector: 'app-group-onboarding',
  imports: [GroupForms],
  templateUrl: './group-onboarding.html',
  styleUrl: './group-onboarding.css',
})
export class GroupOnboarding implements OnInit{
  groupService = inject(GroupService);
  router = inject(Router);

  ngOnInit(): void {
    this.checkAccepted();
  }

  checkAccepted(){
    this.groupService.getMyGroups().subscribe({
      next: (res) => {
        if(res.length > 0)
          this.router.navigate([`/home/${res[0].group_code}`]);
      }
    })
  }
}
