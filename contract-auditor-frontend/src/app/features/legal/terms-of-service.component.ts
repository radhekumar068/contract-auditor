import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';

interface TermsSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [RouterLink, PublicHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-public-header />
      <main>
        <p class="eyebrow">Legal</p>
        <h1>Terms of Service</h1>
        <p class="meta">Effective date: September 1, 2026</p>
        <p class="lead">
          These Terms of Service ("Terms") govern your access to and use of Contract Auditor at
          <strong>contract-auditor.duckdns.org</strong>. By creating an account or using the service, you agree to these Terms.
        </p>

        @for (section of sections; track section.id) {
          <section>
            <h2>{{ section.title }}</h2>
            @for (paragraph of section.paragraphs; track paragraph) {
              <p>{{ paragraph }}</p>
            }
            @if (section.bullets?.length) {
              <ul>
                @for (item of section.bullets; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            }
          </section>
        }

        <p class="contact">
          Questions about these Terms? Contact us at
          <a [href]="'mailto:' + supportEmail">{{ supportEmail }}</a>.
        </p>

        <nav class="legal-nav" aria-label="Related legal pages">
          <a routerLink="/privacy">Privacy Policy</a>
          <a routerLink="/">Back to Home</a>
        </nav>
      </main>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: linear-gradient(180deg, #eef6fb 0%, #f4f7fb 100%);
    }
    main {
      max-width: 820px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem;
      color: #1f2937;
    }
    .eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0b9a6d;
    }
    h1 { margin: 0 0 0.35rem; color: #0a1d37; }
    .meta { margin: 0 0 1rem; color: #6b7280; font-size: 0.92rem; }
    .lead { color: #4b5563; line-height: 1.65; margin-bottom: 1.75rem; }
    section {
      background: #fff;
      border-radius: 12px;
      padding: 1.2rem 1.25rem;
      margin-bottom: 1rem;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
    }
    h2 {
      margin: 0 0 0.75rem;
      font-size: 1.05rem;
      color: #0a1d37;
    }
    p {
      margin: 0 0 0.75rem;
      line-height: 1.65;
      color: #4b5563;
    }
    p:last-child { margin-bottom: 0; }
    ul {
      margin: 0.5rem 0 0;
      padding-left: 1.2rem;
      color: #4b5563;
      line-height: 1.6;
    }
    li + li { margin-top: 0.35rem; }
    .contact {
      margin-top: 1.5rem;
      color: #374151;
    }
    .contact a { color: #0a1d37; }
    .legal-nav {
      display: flex;
      gap: 1rem;
      margin-top: 1.25rem;
      flex-wrap: wrap;
    }
    .legal-nav a {
      color: #0a1d37;
      font-weight: 600;
      text-decoration: none;
    }
    .legal-nav a:hover { text-decoration: underline; }
  `],
})
export class TermsOfServiceComponent {
  readonly supportEmail = 'support@contract-auditor.duckdns.org';

  readonly sections: TermsSection[] = [
    {
      id: 'service',
      title: 'The service',
      paragraphs: [
        'Contract Auditor helps individuals and teams track subscriptions, renewals, contract leakage, and related financial insights.',
        'Features may change over time. We may add, modify, or discontinue functionality with reasonable notice when practical.',
      ],
    },
    {
      id: 'accounts',
      title: 'Accounts and eligibility',
      paragraphs: ['To use the service you must:'],
      bullets: [
        'Provide accurate registration information and keep it up to date.',
        'Maintain the confidentiality of your login credentials.',
        'Be at least 18 years old or have permission from a parent or legal guardian where required by law.',
        'Use the service only for lawful business or personal contract-management purposes.',
      ],
    },
    {
      id: 'gmail',
      title: 'Third-party connections',
      paragraphs: [
        'Optional Gmail integration is provided through Google OAuth. Your use of Google services is also subject to Google\'s terms and policies.',
        'You authorize Contract Auditor to access Gmail data only to the extent permitted by the scopes you approve during connection.',
        'You may revoke access at any time from Settings or from your Google Account security settings.',
      ],
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Access or attempt to access another user\'s account without permission.',
        'Interfere with or disrupt the service, servers, or networks.',
        'Upload malicious code or use the service to violate applicable laws or third-party rights.',
        'Reverse engineer or scrape the service except where such restriction is prohibited by law.',
      ],
    },
    {
      id: 'content',
      title: 'Your content',
      paragraphs: [
        'You retain ownership of contract, subscription, and related data you submit. You grant us a limited license to host, process, and display that data solely to provide and improve the service.',
        'You are responsible for ensuring you have the right to upload or connect data you provide to Contract Auditor.',
      ],
    },
    {
      id: 'disclaimer',
      title: 'Disclaimer',
      paragraphs: [
        'Contract Auditor is provided on an "as is" and "as available" basis. We do not provide legal, tax, or financial advice.',
        'Renewal alerts, savings estimates, and audit insights are informational only. You remain responsible for verifying contract terms and making business decisions.',
      ],
    },
    {
      id: 'liability',
      title: 'Limitation of liability',
      paragraphs: [
        'To the fullest extent permitted by law, Contract Auditor and its operators will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill arising from your use of the service.',
        'Our total liability for any claim relating to the service will not exceed the amount you paid us, if any, in the twelve months before the event giving rise to the claim.',
      ],
    },
    {
      id: 'termination',
      title: 'Suspension and termination',
      paragraphs: [
        'We may suspend or terminate access if you violate these Terms or if necessary to protect the service or other users.',
        'You may stop using the service at any time. Sections that by their nature should survive termination will continue to apply.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these Terms',
      paragraphs: [
        'We may update these Terms from time to time. Continued use of the service after changes become effective constitutes acceptance of the revised Terms.',
      ],
    },
  ];
}
