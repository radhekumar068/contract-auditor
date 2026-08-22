import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <a routerLink="/" class="brand" (click)="closeMenu()">
        <span class="shield" aria-hidden="true">CA</span>
        <span class="brand-name">Contract Auditor</span>
      </a>

      <button
        type="button"
        class="menu-toggle"
        (click)="toggleMenu()"
        [attr.aria-expanded]="menuOpen()"
        aria-controls="public-nav"
        aria-label="Toggle navigation"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          @if (menuOpen()) {
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          } @else {
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          }
        </svg>
      </button>

      <nav id="public-nav" class="nav" [class.open]="menuOpen()" aria-label="Marketing">
        <a routerLink="/" fragment="home" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" (click)="closeMenu()">Home</a>
        <a routerLink="/" fragment="features" (click)="closeMenu()">Product Features</a>
        <a routerLink="/" fragment="pricing" (click)="closeMenu()">Pricing</a>
        <a routerLink="/" fragment="about" (click)="closeMenu()">About Us</a>
      </nav>

      <div class="actions" [class.open]="menuOpen()">
        <a routerLink="/login" class="btn btn-navy" (click)="closeMenu()">Sign In</a>
        <div class="create-wrap">
          <a routerLink="/register" class="btn btn-green" (click)="closeMenu()">Create Account</a>
          <a routerLink="/forgot-password" class="forgot" (click)="closeMenu()">Forgot Password?</a>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }
    .header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1rem 1.5rem;
      max-width: 1180px;
      margin: 0 auto;
      position: relative;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      text-decoration: none;
      color: #0a1d37;
      font-weight: 700;
      font-size: 1.05rem;
      flex-shrink: 0;
    }
    .shield {
      width: 40px;
      height: 44px;
      display: grid;
      place-items: center;
      color: #fff;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 0.82rem;
      letter-spacing: 0.02em;
      background: #16325c;
      clip-path: polygon(50% 0%, 100% 18%, 100% 62%, 50% 100%, 0 62%, 0 18%);
      box-shadow: inset 0 0 0 2px #0d2244;
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.75rem;
      flex: 1;
    }
    .nav a {
      color: #3f3f46;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
    }
    .nav a:hover, .nav a.active { color: #0a1d37; }
    .actions {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      flex-shrink: 0;
    }
    .create-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.28rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 118px;
      padding: 0.55rem 1.1rem;
      border-radius: 6px;
      color: #fff;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      box-shadow: 0 2px 8px rgba(10, 29, 55, 0.16);
    }
    .btn-navy { background: #0a1d37; }
    .btn-navy:hover { background: #061226; }
    .btn-green { background: #0b9a6d; }
    .btn-green:hover { background: #087a56; }
    .forgot {
      color: #6b7280;
      font-size: 0.72rem;
      text-decoration: none;
    }
    .forgot:hover { color: #0a1d37; text-decoration: underline; }
    .menu-toggle {
      display: none;
      margin-left: auto;
      width: 40px;
      height: 40px;
      border: 0;
      background: transparent;
      color: #0a1d37;
      cursor: pointer;
    }
    .menu-toggle svg { width: 22px; height: 22px; }

    @media (max-width: 900px) {
      .header { flex-wrap: wrap; }
      .menu-toggle { display: grid; place-items: center; }
      .nav, .actions {
        display: none;
        width: 100%;
      }
      .nav.open, .actions.open {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
        padding: 0.25rem 0 0.75rem;
      }
      .actions.open { align-items: stretch; }
      .create-wrap { align-items: stretch; }
      .btn { width: 100%; }
    }
  `],
})
export class PublicHeaderComponent {
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900 && this.menuOpen()) {
      this.menuOpen.set(false);
    }
  }
}
