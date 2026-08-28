import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PhoneUpdatePromptComponent } from './phone-update-prompt.component';

interface NavItem {
  label: string;
  path: string;
  icon: 'dashboard' | 'subscriptions' | 'reports' | 'settings' | 'profile';
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PhoneUpdatePromptComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell" [class.nav-open]="mobileNavOpen()">
      <header class="mobile-topbar">
        <button
          type="button"
          class="btn-menu"
          (click)="toggleMobileNav()"
          [attr.aria-expanded]="mobileNavOpen()"
          aria-controls="app-sidebar"
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            @if (mobileNavOpen()) {
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            } @else {
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            }
          </svg>
        </button>
        <div class="mobile-brand">
          <span class="logo">CA</span>
          <span class="title">Contract Auditor</span>
        </div>
      </header>

      <div class="sidebar-backdrop" (click)="closeMobileNav()" aria-hidden="true"></div>

      <nav id="app-sidebar" class="sidebar" aria-label="Main navigation">
        <div class="brand">
          <span class="logo">CA</span>
          <span class="title">Contract Auditor</span>
        </div>
        <ul class="nav-links">
          @for (item of navItems; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                (click)="closeMobileNav()"
              >
                <span class="nav-icon">
                  @switch (item.icon) {
                    @case ('dashboard') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    }
                    @case ('subscriptions') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/><path d="M16 12h5l-1.5 4.5a1 1 0 0 1-.95.7H14"/><path d="M16 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg>
                    }
                    @case ('reports') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    }
                    @case ('settings') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    }
                    @case ('profile') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    }
                  }
                </span>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>
        <div class="user-footer">
          @if (user(); as u) {
            <div class="user-card">
              <span class="avatar">CA</span>
              <span class="user-name">{{ u.fullName }}</span>
              <button type="button" class="btn-icon-logout" (click)="logout()" aria-label="Sign out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          }
          <button type="button" class="btn-logout" (click)="logout()">Sign Out</button>
        </div>
      </nav>

      <main class="content">
        <router-outlet />
      </main>

      @if (showPhonePrompt()) {
        <app-phone-update-prompt
          (dismissed)="closePhonePrompt()"
          (saved)="closePhonePrompt()"
        />
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .shell {
      display: grid;
      grid-template-columns: var(--sidebar-width, 288px) minmax(0, 1fr);
      min-height: 100vh;
      --sidebar-pad-x: 1.75rem;
      --sidebar-pad-y: 1.75rem;
    }

    .mobile-topbar,
    .sidebar-backdrop {
      display: none;
    }

    .sidebar {
      position: sticky;
      top: 0;
      align-self: start;
      height: 100vh;
      background: #1a1d2e;
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      padding: var(--sidebar-pad-y) var(--sidebar-pad-x);
      box-sizing: border-box;
      overflow-y: auto;
      z-index: 40;
    }

    .brand,
    .mobile-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .brand {
      margin-bottom: 2rem;
      padding: 0 0.25rem;
    }

    .logo {
      width: 40px;
      height: 40px;
      background: #2a3149;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8125rem;
      color: #fff;
      flex-shrink: 0;
    }

    .title {
      font-weight: 700;
      font-size: 1rem;
      color: #fff;
      letter-spacing: 0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-links {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1 1 auto;
      min-height: 0;
      align-content: flex-start;
    }

    .nav-links li {
      margin: 0;
      padding: 0;
    }

    .nav-links a {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      color: #94a3b8;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9375rem;
      line-height: 1.2;
      transition: background 0.15s, color 0.15s;
    }

    .nav-links a:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }

    .nav-links a.active {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }

    .nav-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav-icon svg {
      width: 18px;
      height: 18px;
    }

    .nav-label {
      min-width: 0;
    }

    .user-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 1.25rem;
      margin-top: 1.5rem;
      display: grid;
      gap: 0.875rem;
      flex-shrink: 0;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0 0.25rem;
      min-width: 0;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #2a3149;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }

    .user-name {
      flex: 1;
      font-size: 0.875rem;
      color: #e2e8f0;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-icon-logout {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.4rem;
      display: inline-flex;
      align-items: center;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .btn-icon-logout:hover {
      color: #fca5a5;
      background: rgba(220, 38, 38, 0.12);
    }

    .btn-logout {
      padding: 0.7rem 1rem;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #fff;
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      width: 100%;
    }

    .btn-logout:hover {
      background: rgba(220, 38, 38, 0.12);
      border-color: rgba(220, 38, 38, 0.4);
      color: #fca5a5;
    }

    .content {
      padding: 1.75rem 2rem;
      overflow-x: hidden;
      overflow-y: auto;
      background: #eef0f4;
      min-width: 0;
    }

    .btn-menu {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }

    .btn-menu svg {
      width: 20px;
      height: 20px;
    }

    @media (max-width: 1100px) {
      .shell {
        --sidebar-width: 260px;
        --sidebar-pad-x: 1.5rem;
      }

      .title {
        font-size: 0.9375rem;
      }

      .nav-links a {
        font-size: 0.875rem;
        padding: 0.7rem 0.875rem;
      }

      .content {
        padding: 1.5rem 1.5rem;
      }
    }

    @media (max-width: 900px) {
      .shell {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
      }

      .shell.nav-open {
        overflow: hidden;
      }

      .mobile-topbar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        position: sticky;
        top: 0;
        z-index: 50;
        background: #1a1d2e;
        color: #fff;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        z-index: 55;
      }

      .shell.nav-open .sidebar-backdrop {
        opacity: 1;
        pointer-events: auto;
      }

      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: min(300px, 86vw);
        height: 100vh;
        transform: translateX(-105%);
        transition: transform 0.22s ease;
        box-shadow: 8px 0 32px rgba(15, 23, 42, 0.28);
        z-index: 60;
        padding: 1.5rem 1.5rem 1.25rem;
      }

      .shell.nav-open .sidebar {
        transform: translateX(0);
      }

      .content {
        padding: 1.25rem 1rem 1.5rem;
      }
    }

    @media (max-width: 480px) {
      .mobile-brand .title {
        font-size: 0.875rem;
      }

      .sidebar {
        width: min(320px, 92vw);
        padding: 1.25rem 1.25rem 1rem;
      }

      .nav-links a {
        padding: 0.8rem 1rem;
      }
    }
  `],
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);

  readonly user = this.authService.currentUser;
  readonly mobileNavOpen = signal(false);
  readonly showPhonePrompt = signal(false);

  constructor() {
    const currentUser = this.authService.currentUser();
    const dismissed = sessionStorage.getItem(AuthService.phonePromptDismissedKey);
    if (currentUser && !currentUser.phoneNumber && !dismissed) {
      this.showPhonePrompt.set(true);
    }
  }

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Subscriptions', path: '/subscriptions', icon: 'subscriptions' },
    { label: 'Reports', path: '/reports', icon: 'reports' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
    { label: 'Profile', path: '/profile', icon: 'profile' },
  ];

  toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  closePhonePrompt(): void {
    this.showPhonePrompt.set(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900 && this.mobileNavOpen()) {
      this.mobileNavOpen.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/';
  }
}
