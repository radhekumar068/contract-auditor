import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';
import { AuthApiService } from '../../core/services/auth-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PublicHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-public-header />
      <main>
        <div class="card">
          <h1>Forgot Password</h1>
          <p class="subtitle">Enter the email on your Contract Auditor account.</p>

          @if (submitted()) {
            <div class="notice success">{{ successMessage() }}</div>
            <p class="hint">Check your inbox and spam folder. The link expires after a limited time.</p>
            <div class="links">
              <a routerLink="/login" class="btn navy">Back to Sign In</a>
              <a routerLink="/register" class="btn green">Create Account</a>
            </div>
          } @else {
            @if (errorMessage()) {
              <div class="notice error">{{ errorMessage() }}</div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()">
              <label>
                Email
                <input type="email" formControlName="email" autocomplete="email" />
              </label>
              <button type="submit" [disabled]="form.invalid || loading()">
                {{ loading() ? 'Sending…' : 'Send Reset Link' }}
              </button>
            </form>
            <p class="footer">Remembered it? <a routerLink="/login">Sign in</a></p>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: linear-gradient(180deg, #eef6fb 0%, #f4f7fb 100%);
    }
    main { padding: 2.5rem 1.5rem 4rem; }
    .card {
      max-width: 440px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
    }
    h1 { margin: 0 0 .5rem; color: #0a1d37; }
    .subtitle { color: #64748b; margin-bottom: 1.5rem; }
    form { display: grid; gap: 1rem; }
    label { display: grid; gap: .35rem; font-size: .875rem; color: #334155; }
    input { padding: .65rem .75rem; border: 1px solid #cbd5e1; border-radius: 8px; }
    button, .btn {
      padding: .75rem;
      border: 0;
      border-radius: 8px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
    }
    button { background: #0a1d37; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .btn.navy { background: #0a1d37; }
    .btn.green { background: #0b9a6d; }
    .links { display: grid; gap: 0.65rem; }
    .notice {
      padding: .85rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      line-height: 1.45;
    }
    .notice.success { background: #eff6ff; color: #1e3a8a; }
    .notice.error { background: #fef2f2; color: #b91c1c; }
    .hint { color: #64748b; margin: 0 0 1rem; font-size: .9rem; }
    .footer { margin-top: 1rem; text-align: center; color: #64748b; }
    a { color: #0b9a6d; text-decoration: none; }
  `],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal(
    'If an account exists for that email, a password reset link has been sent.',
  );

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authApi
      .forgotPassword({ email: this.form.controls.email.value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message);
          this.submitted.set(true);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            userFacingHttpError(error, 'Unable to send the reset link. Please try again.'),
          );
          this.loading.set(false);
        },
      });
  }
}
