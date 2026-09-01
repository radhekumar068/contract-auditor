import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  tone: 'green' | 'purple' | 'blue';
  icon: 'leakage' | 'calendar' | 'radar' | 'pie' | 'reports' | 'shield';
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  cta: string;
  highlighted: boolean;
  features: string[];
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, PublicHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-public-header />

      <main>
        <section id="home" class="hero">
          <h1>Contract Auditor: Maximize Your ROI, Eliminate Financial Leakage.</h1>
          <p class="subhead">
            Take control of your recurring costs, auto-renewals, and wasted software seats with intelligent auditing.
          </p>

          <div class="cta-row">
            <article class="cta-card">
              <a routerLink="/register" class="cta-btn navy">Get Started (Free Trial)</a>
            </article>
            <article class="cta-card">
              <button type="button" class="cta-btn green" (click)="openDemo()">Request a Demo</button>
            </article>
            <article class="cta-card guide">
              <a routerLink="/user-guide" class="guide-link">
                <span class="guide-icon" aria-hidden="true">
                  <svg viewBox="0 0 48 48" fill="none">
                    <rect x="10" y="6" width="24" height="34" rx="3" fill="#7c5cbf"/>
                    <rect x="14" y="10" width="16" height="26" rx="1.5" fill="#f4f0ff"/>
                    <circle cx="22" cy="23" r="7" fill="#7c5cbf"/>
                    <rect x="20.6" y="18.2" width="2.8" height="7.2" rx="1.2" fill="#fff"/>
                    <circle cx="22" cy="27.4" r="1.3" fill="#fff"/>
                  </svg>
                </span>
                <span class="guide-copy">
                  <strong>User Guide</strong>
                  <small>Learn how audits, renewals, and reports work.</small>
                </span>
                <span class="mini-dash" aria-hidden="true">
                  <span class="node n1"></span>
                  <span class="node n2"></span>
                  <span class="bars">
                    <span></span><span></span><span></span><span></span>
                  </span>
                </span>
              </a>
            </article>
          </div>
        </section>

        <section id="features" class="section">
          <h2>Why is Contract Auditor beneficial for you?</h2>
          <div class="feature-grid">
            @for (feature of features; track feature.id) {
              <article class="feature-card">
                <span class="icon-wrap" [class.green]="feature.tone === 'green'" [class.purple]="feature.tone === 'purple'" [class.blue]="feature.tone === 'blue'" aria-hidden="true">
                  @switch (feature.icon) {
                    @case ('leakage') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8 10a4 4 0 0 1 8 0c0 4-4 8-4 8s-4-4-4-8Z"/>
                        <path d="M9 21h6"/>
                        <path d="M10 11h4"/>
                      </svg>
                    }
                    @case ('calendar') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="5" width="18" height="16" rx="2"/>
                        <path d="M3 10h18M8 3v4M16 3v4"/>
                        <path d="M9 15l2 2 4-4"/>
                      </svg>
                    }
                    @case ('radar') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9"/>
                        <circle cx="12" cy="12" r="5"/>
                        <path d="M12 12l6-3"/>
                        <circle cx="12" cy="12" r="1.4" fill="currentColor"/>
                      </svg>
                    }
                    @case ('pie') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3v9h9"/>
                        <path d="M21 12a9 9 0 1 1-9-9"/>
                      </svg>
                    }
                    @case ('reports') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19V9M10 19V5M16 19v-7"/>
                        <path d="M3 19h18"/>
                        <path d="M14 7l3-3 3 3"/>
                      </svg>
                    }
                    @case ('shield') {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3l8 3v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z"/>
                        <path d="M9 12l2 2 4-4"/>
                      </svg>
                    }
                  }
                </span>
                <div>
                  <h3>{{ feature.title }}</h3>
                  <p>{{ feature.description }}</p>
                </div>
              </article>
            }
          </div>
        </section>

        <section id="pricing" class="section">
          <h2>Pricing</h2>
          <p class="section-lead">Start with a free trial, then choose the plan that matches your contract volume.</p>
          <div class="pricing-grid">
            @for (plan of plans; track plan.id) {
              <article class="price-card" [class.highlighted]="plan.highlighted">
                <h3>{{ plan.name }}</h3>
                <p class="price">{{ plan.price }} <span>{{ plan.cadence }}</span></p>
                <p class="blurb">{{ plan.blurb }}</p>
                <ul>
                  @for (item of plan.features; track item) {
                    <li>{{ item }}</li>
                  }
                </ul>
                @if (plan.id === 'enterprise') {
                  <button type="button" class="cta-btn navy" (click)="openDemo()">{{ plan.cta }}</button>
                } @else {
                  <a routerLink="/register" class="cta-btn" [class.navy]="!plan.highlighted" [class.green]="plan.highlighted">{{ plan.cta }}</a>
                }
              </article>
            }
          </div>
        </section>

        <section id="about" class="section about">
          <h2>About Us</h2>
          <p>
            Contract Auditor helps finance, procurement, and IT teams recover wasted SaaS spend.
            We surface unused seats, risky auto-renewals, and non-standard clauses before they become leakage.
          </p>
          <p>
            Built for operators who need a clear audit trail, executive-ready reporting, and renewal control
            without replacing your existing contract workflow.
          </p>
        </section>
      </main>

      <footer class="footer">
        <p>© Copyright © Contract Auditor, Inc.</p>
        <nav aria-label="Footer">
          <a routerLink="/" fragment="features">Product Features</a>
          <a routerLink="/" fragment="pricing">Pricing</a>
          <a routerLink="/" fragment="about">About</a>
          <a routerLink="/privacy">Privacy Policy</a>
          <a routerLink="/terms">Terms of Service</a>
        </nav>
      </footer>
    </div>

    @if (demoOpen()) {
      <div class="modal-backdrop" (click)="closeDemo()" role="presentation">
        <div class="modal" role="dialog" aria-labelledby="demo-title" (click)="$event.stopPropagation()">
          <h2 id="demo-title">Request a Demo</h2>
          <p>Tell us about your team and we will follow up with a walkthrough of Contract Auditor.</p>
          @if (demoSent()) {
            <div class="success">Thanks. Your demo request is ready on our side. We will contact you at the email you provided.</div>
            <button type="button" class="cta-btn navy" (click)="closeDemo()">Close</button>
          } @else {
            <form [formGroup]="demoForm" (ngSubmit)="submitDemo()">
              <label>
                Full name
                <input type="text" formControlName="fullName" autocomplete="name" />
              </label>
              <label>
                Work email
                <input type="email" formControlName="email" autocomplete="email" />
              </label>
              <label>
                Company
                <input type="text" formControlName="company" autocomplete="organization" />
              </label>
              <label>
                What should we cover?
                <textarea formControlName="message" rows="3"></textarea>
              </label>
              <div class="modal-actions">
                <button type="button" class="ghost" (click)="closeDemo()">Cancel</button>
                <button type="submit" class="cta-btn green" [disabled]="demoForm.invalid">Send request</button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page {
      min-height: 100vh;
      position: relative;
      color: #1a1a1a;
      background:
        radial-gradient(circle at 12% 18%, rgba(186, 220, 255, 0.45), transparent 32%),
        radial-gradient(circle at 88% 8%, rgba(206, 232, 255, 0.4), transparent 28%),
        linear-gradient(180deg, #eef6fb 0%, #f4f7fb 42%, #eef2f6 100%);
    }
    .page::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.22;
      background-image:
        linear-gradient(rgba(120, 144, 168, 0.18) 1px, transparent 1px),
        linear-gradient(90deg, rgba(120, 144, 168, 0.18) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(circle at 50% 20%, #000 20%, transparent 75%);
    }
    .page::after {
      content: '1101010100  0010110011  1011001101  0110100101';
      position: absolute;
      top: 8rem;
      left: 4%;
      right: 4%;
      color: rgba(100, 116, 139, 0.28);
      font-size: 0.72rem;
      letter-spacing: 0.35em;
      pointer-events: none;
      white-space: nowrap;
      overflow: hidden;
    }
    main, .footer { position: relative; z-index: 1; }
    .hero, .section, .footer {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 1.5rem;
      scroll-margin-top: 1rem;
    }
    .hero { padding-top: 2.4rem; text-align: center; }
    h1 {
      margin: 0 auto;
      max-width: 920px;
      font-size: clamp(1.7rem, 3.4vw, 2.35rem);
      line-height: 1.25;
      font-weight: 800;
      color: #1a1a1a;
    }
    .subhead {
      margin: 1rem auto 2rem;
      max-width: 720px;
      color: #4a4a4a;
      font-size: 1.05rem;
      line-height: 1.55;
    }
    .cta-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.1rem;
      margin-bottom: 3.2rem;
    }
    .cta-card {
      background: #fff;
      border-radius: 12px;
      min-height: 118px;
      padding: 1.15rem;
      display: grid;
      place-items: center;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    .cta-card.guide {
      background: #e8eef4;
      place-items: stretch;
    }
    .cta-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      border: 0;
      border-radius: 8px;
      padding: 0.95rem 1rem;
      color: #fff;
      font-weight: 700;
      font-size: 0.98rem;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(10, 29, 55, 0.18);
    }
    .cta-btn.navy { background: #0a1d37; }
    .cta-btn.navy:hover { background: #061226; }
    .cta-btn.green { background: #0b9a6d; }
    .cta-btn.green:hover { background: #087a56; }
    .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .guide-link {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.7rem;
      align-items: center;
      text-decoration: none;
      color: inherit;
      height: 100%;
    }
    .guide-icon svg { width: 48px; height: 48px; display: block; }
    .guide-copy { text-align: left; }
    .guide-copy strong { display: block; font-size: 1.05rem; }
    .guide-copy small { color: #4a4a4a; }
    .mini-dash {
      width: 72px;
      height: 52px;
      position: relative;
    }
    .mini-dash .node {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #7c5cbf;
    }
    .n1 { top: 4px; left: 8px; }
    .n2 { top: 22px; left: 0; }
    .bars {
      position: absolute;
      right: 0;
      bottom: 2px;
      display: flex;
      gap: 3px;
      align-items: flex-end;
      height: 36px;
    }
    .bars span {
      width: 7px;
      background: #5b7c99;
      border-radius: 2px;
    }
    .bars span:nth-child(1) { height: 14px; }
    .bars span:nth-child(2) { height: 22px; }
    .bars span:nth-child(3) { height: 28px; }
    .bars span:nth-child(4) { height: 18px; }

    .section { padding-bottom: 2.75rem; }
    h2 {
      margin: 0 0 1.15rem;
      font-size: 1.35rem;
      color: #1a1a1a;
    }
    .section-lead { margin: -0.4rem 0 1.2rem; color: #4a4a4a; }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
    .feature-card {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.85rem;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1rem 1.05rem;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
      text-align: left;
    }
    .icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      display: grid;
      place-items: center;
    }
    .icon-wrap svg { width: 22px; height: 22px; }
    .icon-wrap.green { background: #e8f8f2; color: #0b9a6d; }
    .icon-wrap.purple { background: #eee8fb; color: #7c5cbf; }
    .icon-wrap.blue { background: #e7eef8; color: #2563eb; }
    .feature-card h3 { margin: 0 0 0.3rem; font-size: 0.98rem; }
    .feature-card p { margin: 0; color: #4a4a4a; font-size: 0.88rem; line-height: 1.45; }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
    .price-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      text-align: left;
    }
    .price-card.highlighted { border-color: #0b9a6d; box-shadow: 0 10px 28px rgba(11, 154, 109, 0.12); }
    .price { margin: 0; font-size: 1.6rem; font-weight: 800; }
    .price span { font-size: 0.85rem; color: #6b7280; font-weight: 500; }
    .blurb { margin: 0; color: #4a4a4a; }
    .price-card ul {
      margin: 0 0 0.5rem;
      padding-left: 1.1rem;
      color: #4a4a4a;
      flex: 1;
    }
    .price-card li { margin: 0.25rem 0; }
    .about p { color: #4a4a4a; line-height: 1.6; max-width: 760px; }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1.1rem 1.5rem 1.6rem;
      color: #4b5563;
      font-size: 0.82rem;
    }
    .footer nav { display: flex; gap: 1.2rem; }
    .footer a { color: #4b5563; text-decoration: none; }
    .footer a:hover { color: #0a1d37; }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      display: grid;
      place-items: center;
      padding: 1rem;
      z-index: 40;
    }
    .modal {
      width: min(460px, 100%);
      background: #fff;
      border-radius: 14px;
      padding: 1.5rem;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
    }
    .modal h2 { margin-bottom: 0.4rem; }
    .modal p { margin: 0 0 1rem; color: #4a4a4a; }
    .modal form, .modal label { display: grid; gap: 0.35rem; }
    .modal form { gap: 0.85rem; }
    .modal input, .modal textarea {
      padding: 0.65rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font: inherit;
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; }
    .ghost {
      border: 0;
      background: transparent;
      color: #4a4a4a;
      cursor: pointer;
      font-weight: 600;
    }
    .success {
      background: #ecfdf5;
      color: #065f46;
      padding: 0.8rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    @media (max-width: 900px) {
      .cta-row, .feature-grid, .pricing-grid { grid-template-columns: 1fr; }
      .footer { flex-direction: column; align-items: flex-start; }
    }
  `],
})
export class LandingComponent {
  private readonly fb = inject(FormBuilder);

  readonly demoOpen = signal(false);
  readonly demoSent = signal(false);

  readonly demoForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    company: ['', [Validators.required, Validators.maxLength(255)]],
    message: ['', [Validators.maxLength(1000)]],
  });

  readonly features: FeatureCard[] = [
    {
      id: 'leakage',
      title: 'Stop Financial Leakage',
      description: 'Identify unused software licenses, redundant tools, and wasted budget.',
      tone: 'green',
      icon: 'leakage',
    },
    {
      id: 'renewals',
      title: 'Automate Renewal Tracking',
      description: 'Get real-time alerts for auto-renewals and cancellation windows.',
      tone: 'green',
      icon: 'calendar',
    },
    {
      id: 'radar',
      title: 'Real-Time Leak Radar',
      description: 'Instantly detect price hikes, contract discrepancies, and cost spikes.',
      tone: 'purple',
      icon: 'radar',
    },
    {
      id: 'spend',
      title: 'Vendor Spend Analysis',
      description: 'Visualize spending across vendors and departments to optimize procurement.',
      tone: 'purple',
      icon: 'pie',
    },
    {
      id: 'reports',
      title: 'Executive Financial Reports',
      description: 'Generate presentation-ready reports on potential savings and audited contracts.',
      tone: 'blue',
      icon: 'reports',
    },
    {
      id: 'risk',
      title: 'Secure Risk Management',
      description: 'Audit contract compliance and identify non-standard clauses.',
      tone: 'purple',
      icon: 'shield',
    },
  ];

  readonly plans: PricingPlan[] = [
    {
      id: 'trial',
      name: 'Free Trial',
      price: '$0',
      cadence: '/ 14 days',
      blurb: 'Audit your first contracts and see leakage before you commit.',
      cta: 'Start free trial',
      highlighted: false,
      features: ['Unlimited contract imports', 'Renewal calendar', 'Leak radar alerts'],
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$49',
      cadence: '/ user / month',
      blurb: 'For finance and procurement teams running ongoing audits.',
      cta: 'Get started',
      highlighted: true,
      features: ['Vendor spend analysis', 'Executive reports', 'Cancellation windows'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      cadence: '',
      blurb: 'Security reviews, SSO, and rollout support for larger estates.',
      cta: 'Request a demo',
      highlighted: false,
      features: ['SSO and role controls', 'Custom reporting', 'Dedicated onboarding'],
    },
  ];

  openDemo(): void {
    this.demoSent.set(false);
    this.demoForm.reset();
    this.demoOpen.set(true);
  }

  closeDemo(): void {
    this.demoOpen.set(false);
  }

  submitDemo(): void {
    if (this.demoForm.invalid) {
      return;
    }
    this.demoSent.set(true);
  }
}
