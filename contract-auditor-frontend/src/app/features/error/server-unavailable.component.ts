import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HealthApiService } from '../../core/services/health-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-server-unavailable',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-page">
      <div class="error-card" role="alert">
        <div class="icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="8" rx="2"/>
            <rect x="6" y="14" width="12" height="6" rx="1"/>
            <line x1="12" y1="12" x2="12" y2="14"/>
            <line x1="8" y1="17" x2="16" y2="17"/>
          </svg>
        </div>
        <h1>Server unavailable</h1>
        <p class="lead">
          We cannot reach the Contract Auditor backend right now.
          Your data is safe, but the app cannot load or save until the server is back online.
        </p>
        <p class="hint">Please confirm the API is running, then try again.</p>
        @if (errorMessage()) {
          <p class="detail">{{ errorMessage() }}</p>
        }
        <button type="button" [disabled]="checking()" (click)="retry()">
          {{ checking() ? 'Checking server...' : 'Try again' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .error-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background: #eef0f4;
    }
    .error-card {
      width: min(480px, 100%);
      background: #fff;
      border-radius: 16px;
      padding: 2.25rem 2rem;
      text-align: center;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.1);
    }
    .icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 1rem;
      border-radius: 14px;
      background: #fff7ed;
      color: #c2410c;
      display: grid;
      place-items: center;
    }
    .icon svg { width: 28px; height: 28px; }
    h1 { margin: 0 0 0.75rem; color: #0f172a; font-size: 1.5rem; }
    .lead { margin: 0; color: #475569; line-height: 1.5; }
    .hint { margin: 0.85rem 0 0; color: #94a3b8; font-size: 0.9rem; }
    .detail {
      margin: 1rem 0 0;
      padding: 0.75rem;
      background: #fef2f2;
      color: #b91c1c;
      border-radius: 10px;
      font-size: 0.875rem;
    }
    button {
      margin-top: 1.5rem;
      width: 100%;
      padding: 0.8rem;
      border: 0;
      border-radius: 10px;
      background: #2563eb;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled { opacity: 0.65; cursor: not-allowed; }
  `],
})
export class ServerUnavailableComponent {
  private readonly healthApi = inject(HealthApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly checking = signal(false);
  readonly errorMessage = signal('');

  retry(): void {
    if (this.checking()) {
      return;
    }
    this.checking.set(true);
    this.errorMessage.set('');
    this.healthApi.check()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (up) => {
          this.checking.set(false);
          if (!up) {
            this.errorMessage.set('The server responded, but it is not ready yet. Please try again shortly.');
            return;
          }
          this.healthApi.markAvailable();
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
          const safeUrl = returnUrl.startsWith('/') && !returnUrl.startsWith('/error') ? returnUrl : '/';
          void this.router.navigateByUrl(safeUrl);
        },
        error: (error) => {
          this.checking.set(false);
          this.errorMessage.set(userFacingHttpError(
            error,
            'The application server is still unavailable. Please try again in a few minutes.',
          ));
        },
      });
  }
}
