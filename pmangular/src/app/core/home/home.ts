import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  authService = inject(AuthService);
  router = inject(Router);

  accessToken = signal<string | null>(localStorage.getItem(environment.ACCESS_TOKEN_KEY));
  refreshToken = signal<string | null>(localStorage.getItem(environment.REFRESH_TOKEN_KEY));
  
  logout(){
    this.authService.logout();
    this.router.navigate([''])
  }
}
