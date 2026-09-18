import { Routes } from '@angular/router';
import { LandingPage } from './Components/landing-page/landing-page';
import { LoginPage } from './Components/login-page/login-page';
import { RegisterPage } from './Components/register-page/register-page';
import { RegisterRolePage } from './Components/register-role-page/register-role-page';
import { RegisterDetailsPage } from './Components/register-details-page/register-details-page';
import { ChatTest } from './Components/chat-test/chat-test';
import { Chat } from './Components/chat/chat';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage
  },
  {
    path: 'login',
    component: LoginPage
  },
  {
    path: 'register',
    component: RegisterPage
  },
  {
    path: 'register/role',
    component: RegisterRolePage
  },
  {
    path: 'register/details',
    component: RegisterDetailsPage
  },
  {
    path: 'chat-test',
    component: ChatTest
  },
  {
    path: 'chat',
    component: Chat
  }
];