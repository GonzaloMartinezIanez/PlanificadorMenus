import { Routes } from '@angular/router';
import { NotFound } from './core/not-found/not-found';
import { Home } from './core/home/home';
import { GroupOnboarding } from './components/groups/group-onboarding/group-onboarding';
import { Login } from './core/login/login';
import { Layout } from './core/layout/layout';
import { GroupJoin } from './components/groups/group-join/group-join';

export const routes: Routes = [
  { 'path': '', redirectTo: 'login', pathMatch: 'full' },
  { 'path': 'login', component: Login },
  { 'path': 'groups/join/:group_code', component:  GroupJoin},
  { 'path': 'groups/onboarding', component: GroupOnboarding },
  {
    'path': '',
    component: Layout,
    children: [
      { 'path': 'home/:groupCode', component: Home },
    ]
  },
  { 'path': '**', component: NotFound }
];
