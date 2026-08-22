import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthApiService } from '../../core/services/auth-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-card">
      <a routerLink="/" class="back">← Back to home</a>
      <h1>Contract Auditor</h1>
      <p class="subtitle">Sign in to manage your subscriptions and contracts</p>

      @if (sessionNotice()) {
        <div class="notice">{{ sessionNotice() }}</div>
      }

      @if (errorMessage()) {
        <div class="error">{{ errorMessage() }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>
          Email
          <input type="email" formControlName="email" autocomplete="email" />
        </label>
        <label>
          Password
          <input type="password" formControlName="password" autocomplete="current-password" />
        </label>
        <button type="submit" [disabled]="form.invalid || loading()">Sign In</button>
      </form>

      <p class="footer">
        <a routerLink="/forgot-password">Forgot Password?</a>
        <span> · </span>
        No account? <a routerLink="/register">Create one</a>
      </p>
    </div>
  `,
  styles: [`
    .auth-card { max-width: 420px; margin: 4rem auto; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(15,23,42,.08); }
    h1 { margin: 0 0 .5rem; color: #0f172a; }
    .subtitle { color: #64748b; margin-bottom: 1.5rem; }
    form { display: grid; gap: 1rem; }
    label { display: grid; gap: .35rem; font-size: .875rem; color: #334155; }
    input { padding: .65rem .75rem; border: 1px solid #cbd5e1; border-radius: 8px; }
    button { padding: .75rem; border: 0; border-radius: 8px; background: #2563eb; color: #fff; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .notice { background: #fff7ed; color: #9a3412; padding: .75rem; border-radius: 8px; margin-bottom: 1rem; }
    .error { background: #fef2f2; color: #b91c1c; padding: .75rem; border-radius: 8px; margin-bottom: 1rem; }
    .back { display: inline-block; margin-bottom: 1rem; font-size: .875rem; }
    .footer { margin-top: 1rem; text-align: center; color: #64748b; }
    a { color: #2563eb; text-decoration: none; }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly sessionNotice = signal(
    this.route.snapshot.queryParamMap.get('reason') === 'session'
      ? 'Your session expired or was broken. Please sign in again.'
      : ''
  );

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.authApi.login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Invalid email or password.'));
        },
      });
  }
}
