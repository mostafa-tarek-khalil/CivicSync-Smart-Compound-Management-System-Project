import { Routes } from '@angular/router';
import { LandingPage } from './Components/landing-page/landing-page';
import { LoginPage } from './Components/login-page/login-page';
import { RegisterPage } from './Components/register-page/register-page';
import { RegisterRolePage } from './Components/register-role-page/register-role-page';
import { RegisterDetailsPage } from './Components/register-details-page/register-details-page';
import { ChatTest } from './Components/chat-test/chat-test';
import { Chat } from './Components/chat/chat';
import { CreateTicket } from './Components/Residant/create-ticket/create-ticket';
import { MaintenancePageComponent } from './Components/Residant/maintaine-view/maintaine-view';
import { ResidentDashboardComponent } from './Components/Residant/residant-dashboard/residant-dashboard';
import { ResidentTicketDetailsComponent } from './Components/Residant/ticket-details/ticket-details';
import { OffersComponent } from './Components/Residant/offers-negotiation/offers-negotiation';

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
  },
 {
    path: 'resident',
    children: [

      // Dashboard
      {
        path: 'dashboard',
        component: ResidentDashboardComponent
      },

      // Create Maintenance Request
      {
        path: 'create-ticket',
        component: CreateTicket
      },

      // My Maintenance Requests
      {
        path: 'maintenance-view',
        component: MaintenancePageComponent
      },

      // Maintenance Request Details
      {
        path: 'maintenance/:id',
        component: ResidentTicketDetailsComponent
      },

      // Technician Offers + Negotiations
      {
        path: 'maintenance/:id/offers',
        component: OffersComponent
      }

    ]
  }

];