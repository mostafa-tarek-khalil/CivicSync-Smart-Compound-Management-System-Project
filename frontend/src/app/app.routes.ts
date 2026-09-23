import { Routes } from '@angular/router';

import { LandingPage } from './Components/landing-page/landing-page';
import { LoginPage } from './Components/login-page/login-page';
import { RegisterPage } from './Components/register-page/register-page';
import { RegisterRolePage } from './Components/register-role-page/register-role-page';
import { RegisterDetailsPage } from './Components/register-details-page/register-details-page';
import { Chat } from './Components/chat/chat';
import { Profile } from './Components/profile/profile';
import { authGuard } from './Guards/auth-guard';
import { Notifications } from './Components/VisitorAccess/pages/notifications/notifications';
import { VisitorRequest } from './Components/VisitorAccess/pages/visitor-request/visitor-request';
import { VisitorEntry } from './Components/VisitorAccess/pages/visitor-entry/visitor-entry';
import { VisitorLookup } from './Components/VisitorAccess/pages/visitor-lookup/visitor-lookup';
import { OtpVerification } from './Components/VisitorAccess/pages/otp-verification/otp-verification';
import { VisitorRequestStatus } from './Components/VisitorAccess/pages/visitor-request-status/visitor-request-status';
import { QrCodeDisplay } from './Components/VisitorAccess/pages/qr-code-display/qr-code-display';
import { VisitStatus } from './Components/VisitorAccess/pages/visit-status/visit-status';
import { QrScanner } from './Components/VisitorAccess/pages/qr-scanner/qr-scanner';
import { SecurityDashboard } from './Components/VisitorAccess/pages/security-dashboard/security-dashboard';
import { VisitorDetails } from './Components/VisitorAccess/pages/visitor-details/visitor-details';
import { CheckInOut } from './Components/VisitorAccess/pages/check-in-out/check-in-out';
import { AccessHistory } from './Components/VisitorAccess/pages/access-history/access-history';
import { SecurityVisits } from './Components/VisitorAccess/pages/security-visits/security-visits';
import { ResidentVisitorRequests } from './Components/VisitorAccess/pages/resident-visitor-requests/resident-visitor-requests';

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
    path: 'chat',
    component: Chat,
    canActivate: [authGuard]
  },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'notifications', component: Notifications, canActivate: [authGuard] },
  { path: 'visitor-entry', component: VisitorEntry },
  { path: 'visitor-lookup', component: VisitorLookup },
  { path: 'visitor-request', component: VisitorRequest },
  { path: 'resident-visitor-requests', component: ResidentVisitorRequests, canActivate: [authGuard], data: { roles: ['RESIDENT'] } },
  { path: 'otp-verification', component: OtpVerification },
  { path: 'visitor-request-status', component: VisitorRequestStatus },
  { path: 'qr-code-display', component: QrCodeDisplay },
  { path: 'visit-status', component: VisitStatus },
  { path: 'security-dashboard', component: SecurityDashboard, canActivate: [authGuard], data: { roles: ['SECURITY'] } },
  { path: 'qr-scanner', component: QrScanner, canActivate: [authGuard], data: { roles: ['SECURITY'] } },
  { path: 'visitor-details', component: VisitorDetails, canActivate: [authGuard], data: { roles: ['SECURITY'] } },
  { path: 'check-in-out', component: CheckInOut, canActivate: [authGuard], data: { roles: ['SECURITY'] } },
  { path: 'access-history', component: AccessHistory, canActivate: [authGuard], data: { roles: ['SECURITY'] } },
  { path: 'security-visits', component: SecurityVisits, canActivate: [authGuard], data: { roles: ['SECURITY'] } },
  { path: '**', redirectTo: '' }
];
