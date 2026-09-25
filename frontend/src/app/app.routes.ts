import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { AuthenticatedLayoutComponent } from './core/layout/authenticated-layout/authenticated-layout';

/**
 * Application routes.
 *
 * Every page is lazy-loaded with `loadComponent`, so each feature ships in its
 * own chunk on first visit instead of inflating the initial bundle. Only the
 * authenticated shell (used on almost every route) is imported eagerly.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./Components/landing-page/landing-page').then(m => m.LandingPage),
    pathMatch: 'full'
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./Components/login-page/login-page').then(m => m.LoginPage)
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./Components/register-page/register-page').then(m => m.RegisterPage)
  },

  {
    path: 'register/role',
    loadComponent: () =>
      import('./Components/register-role-page/register-role-page').then(
        m => m.RegisterRolePage
      )
  },

  {
    path: 'register/details',
    loadComponent: () =>
      import('./Components/register-details-page/register-details-page').then(
        m => m.RegisterDetailsPage
      )
  },

  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./Components/forgot-password-page/forgot-password-page').then(
        m => m.ForgotPasswordPage
      )
  },

  {
    path: 'reset-password',
    loadComponent: () =>
      import('./Components/reset-password-page/reset-password-page').then(
        m => m.ResetPasswordPage
      )
  },

  // ---------- Shared authenticated pages (unified shell) ----------
  // Chat, notifications and profile are role-agnostic, so they live under the
  // single AuthenticatedLayout (topbar + role-aware sidebar + outlet).
  {
    path: '',
    component: AuthenticatedLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'chat',
        loadComponent: () =>
          import('./Components/chat/chat').then(m => m.Chat)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./Components/profile/profile').then(m => m.Profile)
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import(
            './Components/shared/notifications/notifications'
          ).then(m => m.Notifications)
      }
    ]
  },

  // Access denied is reached through the guard when a role is not allowed.
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./shared/components/access-denied/access-denied').then(
        m => m.AccessDeniedComponent
      ),
    canActivate: [authGuard]
  },

  {
    path: 'admin',
    component: AuthenticatedLayoutComponent,
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./Components/admin-dashboard/admin-dashboard').then(
            m => m.AdminDashboardComponent
          )
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./Components/admin/users/admin-users').then(m => m.AdminUsers)
      },
      {
        path: 'compound',
        loadComponent: () =>
          import('./Components/admin/compound/admin-compound').then(
            m => m.AdminCompound
          )
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./Components/admin/maintenance/admin-maintenance').then(
            m => m.AdminMaintenance
          )
      },
      {
        path: 'visitors',
        loadComponent: () =>
          import('./Components/admin/visitors/admin-visitors').then(
            m => m.AdminVisitors
          )
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./Components/admin/invoices/admin-invoices').then(
            m => m.AdminInvoices
          )
      },
      {
        path: 'invoices/:invoiceId',
        loadComponent: () =>
          import(
            './Components/admin/invoices/invoice-detail/admin-invoice-detail'
          ).then(m => m.AdminInvoiceDetail)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./Components/admin/reports/admin-reports').then(
            m => m.AdminReportsPage
          )
      }
    ]
  },

  // ---------- Public visitor access (no account required) ----------
  {
    path: 'visitor-entry',
    loadComponent: () =>
      import('./Components/VisitorAccess/pages/public/visitor-entry/visitor-entry').then(
        m => m.VisitorEntry
      )
  },
  {
    path: 'visitor-lookup',
    loadComponent: () =>
      import('./Components/VisitorAccess/pages/security/visitor-lookup/visitor-lookup').then(
        m => m.VisitorLookup
      )
  },
  {
    path: 'visitor-request',
    loadComponent: () =>
      import('./Components/VisitorAccess/pages/public/visitor-request/visitor-request').then(
        m => m.VisitorRequest
      )
  },
  // Visitors now live inside the resident shell (same sidebar/navigation);
  // the old flat URL is kept as a redirect so existing links still work.
  { path: 'resident-visitor-requests', redirectTo: 'resident/visitors', pathMatch: 'full' },
  {
    path: 'otp-verification',
    loadComponent: () =>
      import('./Components/VisitorAccess/pages/public/otp-verification/otp-verification').then(
        m => m.OtpVerification
      )
  },
  {
    path: 'visitor-request-status',
    loadComponent: () =>
      import(
        './Components/VisitorAccess/pages/public/visitor-request-status/visitor-request-status'
      ).then(m => m.VisitorRequestStatus)
  },
  {
    path: 'visitor-chat',
    loadComponent: () =>
      import('./Components/VisitorAccess/pages/public/visitor-chat/visitor-chat').then(
        m => m.VisitorChat
      )
  },
  {
    path: 'qr-code-display',
    loadComponent: () =>
      import('./Components/VisitorAccess/pages/public/qr-code-display/qr-code-display').then(
        m => m.QrCodeDisplay
      )
  },
  {
    path: 'visit-status',
    loadComponent: () =>
      import('./Components/VisitorAccess/pages/public/visit-status/visit-status').then(
        m => m.VisitStatus
      )
  },
  {
    path: 'visit-in-progress',
    loadComponent: () =>
      import(
        './Components/VisitorAccess/pages/public/visit-in-progress/visit-in-progress'
      ).then(m => m.VisitInProgress)
  },

  // ---------- Security (visitor access control) ----------
  // The old flat URLs redirect into the consolidated module so existing
  // links and bookmarks keep working.
  { path: 'security-dashboard', redirectTo: 'security/visitors', pathMatch: 'full' },
  { path: 'security-visits', redirectTo: 'security/visitors/list', pathMatch: 'full' },
  { path: 'qr-scanner', redirectTo: 'security/visitors/scanner', pathMatch: 'full' },
  { path: 'check-in-out', redirectTo: 'security/visitors/check-in-out', pathMatch: 'full' },
  { path: 'access-history', redirectTo: 'security/visitors/history', pathMatch: 'full' },
  { path: 'visitor-details', redirectTo: 'security/visitors/details', pathMatch: 'full' },
  {
    path: 'security',
    component: AuthenticatedLayoutComponent,
    canActivate: [authGuard],
    data: { roles: ['SECURITY'] },
    children: [
      { path: '', redirectTo: 'visitors', pathMatch: 'full' },
      {
        path: 'visitors',
        children: [
          {
            path: '',
            loadComponent: () =>
              import(
                './Components/VisitorAccess/pages/security/security-dashboard/security-dashboard'
              ).then(m => m.SecurityDashboard)
          },
          {
            path: 'list',
            loadComponent: () =>
              import(
                './Components/VisitorAccess/pages/security/security-visits/security-visits'
              ).then(m => m.SecurityVisits)
          },
          {
            path: 'scanner',
            loadComponent: () =>
              import(
                './Components/VisitorAccess/pages/security/qr-scanner/qr-scanner'
              ).then(m => m.QrScanner)
          },
          {
            path: 'history',
            loadComponent: () =>
              import(
                './Components/VisitorAccess/pages/security/access-history/access-history'
              ).then(m => m.AccessHistory)
          },
          {
            path: 'check-in-out',
            loadComponent: () =>
              import(
                './Components/VisitorAccess/pages/security/check-in-out/check-in-out'
              ).then(m => m.CheckInOut)
          },
          {
            path: 'details',
            loadComponent: () =>
              import(
                './Components/VisitorAccess/pages/security/visitor-details/visitor-details'
              ).then(m => m.VisitorDetails)
          }
        ]
      }
    ]
  },

  // ---------- Resident (maintenance) ----------
  {
    path: 'resident',
    component: AuthenticatedLayoutComponent,
    canActivate: [authGuard],
    data: { roles: ['RESIDENT'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './Components/Residant/residant-dashboard/residant-dashboard'
          ).then(m => m.ResidentDashboardComponent)
      },
      {
        path: 'visitors',
        loadComponent: () =>
          import(
            './Components/VisitorAccess/pages/resident/resident-visitor-requests/resident-visitor-requests'
          ).then(m => m.ResidentVisitorRequests)
      },
      {
        path: 'create-visit',
        loadComponent: () =>
          import(
            './Components/Residant/resident-create-visit/resident-create-visit'
          ).then(m => m.ResidentCreateVisit)
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./Components/Residant/resident-invoices/resident-invoices').then(
            m => m.ResidentInvoices
          )
      },
      {
        path: 'create-ticket',
        loadComponent: () =>
          import('./Components/Residant/create-ticket/create-ticket').then(
            m => m.CreateTicket
          )
      },
      {
        path: 'maintenance-view',
        loadComponent: () =>
          import('./Components/Residant/maintaine-view/maintaine-view').then(
            m => m.MaintenancePageComponent
          )
      },
      {
        path: 'maintenance/:id',
        loadComponent: () =>
          import('./Components/Residant/ticket-details/ticket-details').then(
            m => m.ResidentTicketDetailsComponent
          )
      },
      {
        path: 'maintenance/:id/offers',
        loadComponent: () =>
          import(
            './Components/Residant/offers-negotiation/offers-negotiation'
          ).then(m => m.OffersComponent)
      }
    ]
  },

  // ---------- Technician ----------
  {
    path: 'technician',
    component: AuthenticatedLayoutComponent,
    canActivate: [authGuard],
    data: { roles: ['TECHNICIAN'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./Components/Technician/tech-daseboard/tech-daseboard').then(
            m => m.TechnicianDashboardComponent
          )
      },
      {
        path: 'available-requests',
        loadComponent: () =>
          import('./Components/Technician/avilable-tickets/avilable-tickets').then(
            m => m.AvailableRequestsComponent
          )
      },
      {
        path: 'assigned-jobs',
        loadComponent: () =>
          import('./Components/Technician/tech-jobs/tech-jobs').then(
            m => m.AssignedJobsComponent
          )
      },
      { path: 'availableTickets', redirectTo: 'available-requests', pathMatch: 'full' },
      { path: 'assignJobs', redirectTo: 'assigned-jobs', pathMatch: 'full' },
      {
        path: 'available-request/:id',
        loadComponent: () =>
          import(
            './Components/Technician/avilable-ticket-details/avilable-ticket-details'
          ).then(m => m.TechnicianTicketDetailsComponent),
        data: { mode: 'available' }
      },
      {
        path: 'job/:id',
        loadComponent: () =>
          import(
            './Components/Technician/avilable-ticket-details/avilable-ticket-details'
          ).then(m => m.TechnicianTicketDetailsComponent),
        data: { mode: 'assigned' }
      },
      {
        path: 'job/:id/create-offer',
        loadComponent: () =>
          import('./Components/Technician/createoffer/createoffer').then(
            m => m.CreateOfferComponent
          )
      },
      {
        path: 'my-offers',
        loadComponent: () =>
          import('./Components/Technician/myoffers/myoffers').then(
            m => m.MyOffersComponent
          )
      },
      {
        path: 'offer/:offerId/negotiation',
        loadComponent: () =>
          import('./Components/Technician/technegetition/technegetition').then(
            m => m.NegotiationComponent
          )
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./Components/Technician/techreviews/techreviews').then(
            m => m.TechnicianReviewsComponent
          )
      }
    ]
  },

  // Unknown URLs get a real 404 page (not a silent redirect home).
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found').then(
        m => m.NotFoundComponent
      )
  }
];
