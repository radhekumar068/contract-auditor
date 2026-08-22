import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';

interface GuideStep {
  id: string;
  title: string;
  detail: string;
}

@Component({
  selector: 'app-user-guide',
  standalone: true,
  imports: [RouterLink, PublicHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-public-header />
      <main>
        <h1>User Guide</h1>
        <p class="lead">Use this walkthrough to go from first login to a complete contract audit.</p>
        <ol>
          @for (step of steps; track step.id) {
            <li>
              <h2>{{ step.title }}</h2>
              <p>{{ step.detail }}</p>
            </li>
          }
        </ol>
        <a routerLink="/register" class="cta">Get Started (Free Trial)</a>
      </main>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: linear-gradient(180deg, #eef6fb 0%, #f4f7fb 100%);
    }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem;
    }
    h1 { margin: 0 0 0.5rem; color: #0a1d37; }
    .lead { color: #4a4a4a; margin-bottom: 1.5rem; }
    ol { display: grid; gap: 1rem; padding-left: 1.2rem; }
    li {
      background: #fff;
      border-radius: 12px;
      padding: 1rem 1.1rem;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
    }
    h2 { margin: 0 0 0.35rem; font-size: 1.05rem; }
    p { margin: 0; color: #4a4a4a; line-height: 1.5; }
    .cta {
      display: inline-flex;
      margin-top: 1.5rem;
      padding: 0.8rem 1.2rem;
      border-radius: 8px;
      background: #0a1d37;
      color: #fff;
      text-decoration: none;
      font-weight: 700;
    }
  `],
})
export class UserGuideComponent {
  readonly steps: GuideStep[] = [
    {
      id: 'account',
      title: 'Create an account',
      detail: 'Register with your work email, then sign in to open the dashboard.',
    },
    {
      id: 'contracts',
      title: 'Add contracts and subscriptions',
      detail: 'Import vendors, seats, renewal dates, and cancellation windows so leakage can be measured.',
    },
    {
      id: 'radar',
      title: 'Review leak radar and renewals',
      detail: 'Watch for unused seats, price hikes, and auto-renewals that need action before the cutoff.',
    },
    {
      id: 'reports',
      title: 'Share executive reports',
      detail: 'Export savings and audit findings for finance, procurement, and leadership reviews.',
    },
  ];
}
