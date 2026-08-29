import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EmailDiscoveryApiService } from '../../core/services/email-discovery-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-google-oauth-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="callback-page">
      @if (error()) {
        <p class="error">{{ error() }}</p>
        <button type="button" (click)="goToSubscriptions()">Back to Subscriptions</button>
      } @else {
        <p>Connecting Gmail...</p>
      }
    </div>
  `,
  styles: [`
    .callback-page { max-width: 480px; margin: 4rem auto; padding: 2rem; text-align: center; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
    .error { color: #dc2626; margin-bottom: 1rem; }
    button { padding: .55rem 1rem; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
  `],
})
export class GoogleOAuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly emailDiscoveryApi = inject(EmailDiscoveryApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly error = signal('');

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const oauthError = this.route.snapshot.queryParamMap.get('error');

    if (oauthError) {
      this.error.set('Gmail connection was cancelled or denied.');
      return;
    }
    if (!code || !state) {
      this.error.set('Missing OAuth parameters. Please try connecting again.');
      return;
    }

    this.emailDiscoveryApi.connect(code, state)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigate(['/subscriptions'], { queryParams: { discover: 'review' } });
        },
        error: (err) => {
          this.error.set(userFacingHttpError(err, 'Failed to connect Gmail. Please try again.'));
        },
      });
  }

  goToSubscriptions(): void {
    void this.router.navigate(['/subscriptions']);
  }
}
