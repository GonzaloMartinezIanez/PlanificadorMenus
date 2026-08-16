import { Routes } from '@angular/router';
import { NotFound } from './core/not-found/not-found';
import { GroupOnboarding } from './components/groups/group-onboarding/group-onboarding';
import { Login } from './core/login/login';
import { Layout } from './core/layout/layout';
import { GroupJoin } from './components/groups/group-join/group-join';
import { GroupAccess } from './components/groups/group-access/group-access';

import { authGuard } from './guards/auth-guard';
import { groupGuard } from './guards/group-guard';
import { GroupManage } from './components/groups/group-manage/group-manage';
import { List } from './components/lists/list/list';
import { RecipeDetail } from './components/recipes/recipe-detail/recipe-detail';
import { Recipes } from './components/recipes/recipes';
import { RecipeCreate } from './components/recipes/recipe-create/recipe-create';
import { Menus } from './components/menus/menus';

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
      { 'path': 'home/:group_code', component: Menus, canActivate: [groupGuard] },
      { 'path': 'list/:group_code', component: List, canActivate: [groupGuard] },
      { 'path': 'groups/access', component: GroupAccess },
      { 'path': 'recipes', component: Recipes },
      { 'path': 'recipes/create', component: RecipeCreate },
      { 'path': 'recipes/create-from/:originalId', component: RecipeCreate },
      { 'path': 'recipes/:id/edit', component: RecipeCreate },
      { 'path': 'recipes/:id', component: RecipeDetail },
      { 'path': 'groups/:group_code/manage', component: GroupManage, canActivate: [groupGuard] },
    ]
  },
  { 'path': '**', component: NotFound }
];
