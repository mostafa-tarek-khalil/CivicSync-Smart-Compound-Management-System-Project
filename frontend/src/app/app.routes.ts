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

import { TechnicianDashboardComponent } from './Components/Technician/tech-daseboard/tech-daseboard';
import { TechnicianLayoutComponent } from './Components/Technician/tech-layout/tech-layout';
import { AssignedJobsComponent } from './Components/Technician/tech-jobs/tech-jobs';
import { AvailableRequestsComponent } from './Components/Technician/avilable-tickets/avilable-tickets';
import { TechnicianReviewsComponent } from './Components/Technician/techreviews/techreviews';
import { TechnicianTicketDetailsComponent } from './Components/Technician/avilable-ticket-details/avilable-ticket-details';
import { CreateOfferComponent } from './Components/Technician/createoffer/createoffer';
import { MyOffersComponent } from './Components/Technician/myoffers/myoffers';
import { NegotiationComponent } from './Components/Technician/technegetition/technegetition';

export const routes: Routes = [

  { path: '', component: LandingPage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'register/role', component: RegisterRolePage },
  { path: 'register/details', component: RegisterDetailsPage },
  { path: 'chat-test', component: ChatTest },
  { path: 'chat', component: Chat },

  {
    path: 'resident',
    children: [
      { path: 'dashboard', component: ResidentDashboardComponent },
      { path: 'create-ticket', component: CreateTicket },
      { path: 'maintenance-view', component: MaintenancePageComponent },
      { path: 'maintenance/:id', component: ResidentTicketDetailsComponent },
      { path: 'maintenance/:id/offers', component: OffersComponent }
    ]
  },

  {
    path: 'technician',
    component: TechnicianLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: TechnicianDashboardComponent },
      // المسارات الرسمية (متطابقة مع الـ sidebar)
      { path: 'available-requests', component: AvailableRequestsComponent },
      { path: 'assigned-jobs', component: AssignedJobsComponent },
      // Aliases للمسارات القديمة عشان أي لينك قديم ميطلعش 404
      { path: 'availableTickets', redirectTo: 'available-requests', pathMatch: 'full' },
      { path: 'assignJobs', redirectTo: 'assigned-jobs', pathMatch: 'full' },

      // تفاصيل الطلب المتاح: عرض + Create Offer + Skip
      {
        path: 'available-request/:id',
        component: TechnicianTicketDetailsComponent,
        data: { mode: 'available' }
      },

      // تفاصيل الشغل المعين (assign-ticket-details): Start / Resolve
      {
        path: 'job/:id',
        component: TechnicianTicketDetailsComponent,
        data: { mode: 'assigned' }
      },

      { path: 'job/:id/create-offer', component: CreateOfferComponent },
      { path: 'my-offers', component: MyOffersComponent },
      { path: 'offer/:offerId/negotiation', component: NegotiationComponent },
      { path: 'reviews', component: TechnicianReviewsComponent }
    ]
  }

];