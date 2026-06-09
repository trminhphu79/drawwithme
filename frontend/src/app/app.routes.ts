import { Routes } from '@angular/router';
import { adminGuard } from './features/admin/admin.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'join',
  },
  {
    path: 'join',
    title: 'Join a Room · DrawWithMe',
    loadComponent: () => import('./features/lobby/join-room/join-room').then((m) => m.JoinRoom),
  },
  {
    path: 'profile',
    title: 'Profile · DrawWithMe',
    loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: 'my-rooms',
    title: 'My Rooms · DrawWithMe',
    loadComponent: () => import('./features/my-rooms/my-rooms-page').then((m) => m.MyRoomsPage),
  },
  {
    path: 'help',
    title: 'Help · DrawWithMe',
    loadComponent: () => import('./features/info/help-page/help-page').then((m) => m.HelpPage),
  },
  {
    path: 'about',
    title: 'About · DrawWithMe',
    loadComponent: () => import('./features/info/about-page/about-page').then((m) => m.AboutPage),
  },
  {
    path: 'admin/login',
    title: 'Admin · DrawWithMe',
    loadComponent: () => import('./features/admin/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin',
    title: 'Admin · DrawWithMe',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'rooms' },
      {
        path: 'rooms',
        loadComponent: () => import('./features/admin/admin-rooms/admin-rooms').then((m) => m.AdminRooms),
      },
    ],
  },
  {
    path: 'room/:code',
    title: 'Drawing Room · DrawWithMe',
    loadComponent: () => import('./features/room/drawing-room/drawing-room').then((m) => m.DrawingRoom),
  },
  {
    path: 'artwork/:id',
    title: 'Final Artwork · DrawWithMe',
    loadComponent: () =>
      import('./features/review/review-artwork/review-artwork').then((m) => m.ReviewArtwork),
  },
  {
    // Public, shareable view — no "Back to room" (visitor isn't a participant).
    path: 'view/:id',
    title: 'Artwork · DrawWithMe',
    data: { publicView: true },
    loadComponent: () =>
      import('./features/review/review-artwork/review-artwork').then((m) => m.ReviewArtwork),
  },
  {
    path: '**',
    redirectTo: 'join',
  },
];
