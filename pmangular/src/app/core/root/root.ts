import { Component, inject } from '@angular/core';
import { Login } from "../login/login";
import { Home } from '../home/home';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-root',
  imports: [Login, Home],
  templateUrl: './root.html',
  styleUrl: './root.css',
})
export class Root {
  protected readonly authService = inject(AuthService);
}
