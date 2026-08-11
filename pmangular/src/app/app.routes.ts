import { Routes } from '@angular/router';
import { NotFound } from './core/not-found/not-found';
import { Home } from './core/home/home';
import { GroupOnboarding } from './components/groups/group-onboarding/group-onboarding';
import { Login } from './core/login/login';
import { Layout } from './core/layout/layout';
import { GroupJoin } from './components/groups/group-join/group-join';
import { GroupAccess } from './components/groups/group-access/group-access';

import { authGuard } from './guards/auth-guard';
import { groupGuard } from './guards/group-guard';
import { GroupManage } from './components/groups/group-manage/group-manage';

export const routes: Routes = [
  { 'path': '', redirectTo: 'login', pathMatch: 'full' },
  { 'path': 'login', component: Login },
  { 'path': 'groups/:group_code/join', component: GroupJoin},
  { 'path': 'group-onboarding', component: GroupOnboarding, canActivate: [authGuard] },
  {
    'path': '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { 'path': 'home/:group_code', component: Home, canActivate: [groupGuard] },
      { 'path': 'groups/access', component: GroupAccess },
      { 'path': 'groups/:group_code/manage', component: GroupManage, canActivate: [groupGuard] },
    ]
  },
  { 'path': '**', component: NotFound }
];
