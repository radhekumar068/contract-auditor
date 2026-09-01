import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';

interface PolicySection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink, PublicHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-public-header />
      <main>
        <p class="eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p class="meta">Effective date: September 1, 2026</p>
        <p class="lead">
          Contract Auditor ("we", "us", or "our") explains here how we collect, use, store, and protect
          information when you use <strong>contract-auditor.duckdns.org</strong> and related services.
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
          Questions about this policy? Contact us at
          <a [href]="'mailto:' + supportEmail">{{ supportEmail }}</a>.
        </p>

        <nav class="legal-nav" aria-label="Related legal pages">
          <a routerLink="/terms">Terms of Service</a>
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
export class PrivacyPolicyComponent {
  readonly supportEmail = 'support@contract-auditor.duckdns.org';

  readonly sections: PolicySection[] = [
    {
      id: 'information',
      title: 'Information we collect',
      paragraphs: ['We collect information you provide directly and information generated when you use the service:'],
      bullets: [
        'Account details such as name, email address (stored using industry-standard hashing).',
        'Contract and subscription data you enter, import, or confirm inside the application.',
        'Usage data such as login timestamps, feature interactions, and diagnostic logs needed to operate the service.',
      ],
    },
    {
      id: 'gmail',
      title: 'Gmail connection (optional)',
      paragraphs: [
        'If you choose Connect Gmail, we request read-only access to your Gmail account through Google OAuth.',
        'We use the gmail.readonly scope solely to scan your inbox for subscription and billing-related messages so we can suggest contracts you may want to track.',
        'We do not send email on your behalf, modify messages, or request permission to delete mail.',
      ],
      bullets: [
        'OAuth tokens are stored in encrypted form on our servers.',
        'Message content is processed to detect vendor names, amounts, renewal dates, and similar metadata.',
        'You can disconnect Gmail at any time from Settings, which revokes our access and removes stored tokens.',
      ],
    },
    {
      id: 'use',
      title: 'How we use information',
      paragraphs: ['We use collected information to:'],
      bullets: [
        'Provide contract auditing, renewal tracking, reporting, and email-based discovery features.',
        'Authenticate users, secure accounts, and prevent abuse.',
        'Send service-related notifications such as password reset or renewal reminders when enabled.',
        'Improve reliability, troubleshoot issues, and maintain audit logs required for operations.',
      ],
    },
    {
      id: 'sharing',
      title: 'How we share information',
      paragraphs: [
        'We do not sell your personal information. We share data only with service providers that help us host and operate Contract Auditor (for example, cloud infrastructure and email delivery), and only to the extent needed to provide the service.',
        'We may disclose information if required by law or to protect the rights, safety, and security of users and the service.',
      ],
    },
    {
      id: 'retention',
      title: 'Data retention and deletion',
      paragraphs: [
        'We retain account and contract data while your account is active. If you disconnect Gmail, associated OAuth tokens are removed and we stop scanning your inbox.',
        'You may request account deletion by contacting support. We will delete or anonymize personal data unless we must retain it for legal, security, or backup obligations.',
      ],
    },
    {
      id: 'security',
      title: 'Security',
      paragraphs: [
        'We use technical and organizational safeguards such as encrypted transport (HTTPS), access controls, and encrypted storage for sensitive tokens.',
        'No method of transmission or storage is completely secure; please use a strong password and keep your login credentials confidential.',
      ],
    },
    {
      id: 'rights',
      title: 'Your choices and rights',
      paragraphs: ['Depending on your location, you may have rights to access, correct, export, or delete personal information. You can:'],
      bullets: [
        'Update profile details in the application.',
        'Disconnect Gmail from Settings.',
        'Contact support to request data export or account deletion.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. We will post the revised version on this page and update the effective date above.',
      ],
    },
  ];
}
