import { Component, inject, OnInit, signal } from '@angular/core';
import { Login } from "../login/login";
import { Home } from '../home/home';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-root',
  imports: [Login],
  templateUrl: './root.html',
  styleUrl: './root.css',
})
export class Root implements OnInit{
  authService = inject(AuthService);
  groupService = inject(GroupService);
  router = inject(Router);

  ngOnInit(): void {
    if(localStorage.getItem(environment.ACCESS_TOKEN_KEY)){
      this.groupService.getMyGroups().subscribe(res => {
        if(res.length > 0){
          this.router.navigate([`/home/${res[0].group_code}`])
        } else{
          this.router.navigate(['group-onboarding'])
        }
      })
    }
  }
}