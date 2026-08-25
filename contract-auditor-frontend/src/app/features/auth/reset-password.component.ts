import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';
import { AuthApiService } from '../../core/services/auth-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PublicHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-public-header />
      <main>
        <div class="card">
          <h1>Reset Password</h1>
          <p class="subtitle">Enter a new password for your Contract Auditor account.</p>

          @if (validating()) {
            <div class="notice">Checking your reset link…</div>
          } @else if (tokenInvalid()) {
            <div class="notice error">{{ tokenErrorMessage() }}</div>
            <p class="hint">Request a reset link first, then open the link from your email to reach this page.</p>
            <div class="links">
              <a routerLink="/forgot-password" class="btn navy">Send Reset Link</a>
              <a routerLink="/login" class="btn green">Back to Sign In</a>
            </div>
          } @else if (completed()) {
            <div class="notice success">{{ successMessage() }}</div>
            <a routerLink="/login" class="btn navy">Sign In</a>
          } @else {
            @if (errorMessage()) {
              <div class="notice error">{{ errorMessage() }}</div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()">
              <label>
                New Password
                <input type="password" formControlName="newPassword" autocomplete="new-password" />
              </label>
              <label>
                Confirm Password
                <input type="password" formControlName="confirmPassword" autocomplete="new-password" />
              </label>
              @if (passwordMismatch()) {
                <div class="field-error">Passwords do not match.</div>
              }
              <button type="submit" [disabled]="form.invalid || loading() || passwordMismatch()">
                {{ loading() ? 'Updating…' : 'Update Password' }}
              </button>
            </form>
            <p class="footer">
              <a routerLink="/forgot-password">Need a reset link?</a>
              <span> · </span>
              <a routerLink="/login">Back to sign in</a>
            </p>
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
      display: block;
      padding: .75rem;
      border: 0;
      border-radius: 8px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
    }
    button { background: #0a1d37; width: 100%; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .btn.navy { background: #0a1d37; }
    .btn.green { background: #0b9a6d; }
    .links { display: grid; gap: 0.65rem; }
    .notice {
      padding: .85rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      line-height: 1.45;
      background: #eff6ff;
      color: #1e3a8a;
    }
    .notice.success { background: #ecfdf5; color: #065f46; }
    .notice.error { background: #fef2f2; color: #b91c1c; }
    .hint { color: #64748b; margin: 0 0 1rem; font-size: .9rem; line-height: 1.45; }
    .field-error { color: #b91c1c; font-size: .875rem; }
    .footer { margin-top: 1rem; text-align: center; color: #64748b; }
    a { color: #0b9a6d; text-decoration: none; }
  `],
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private token = '';

  readonly validating = signal(true);
  readonly tokenInvalid = signal(false);
  readonly tokenErrorMessage = signal('This password reset link is invalid or has expired.');
  readonly completed = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('Your password has been updated. You can now sign in with your new password.');

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: (group) => {
      const password = group.get('newPassword')?.value ?? '';
      const confirm = group.get('confirmPassword')?.value ?? '';
      if (!password || !confirm) {
        return null;
      }
      return password !== confirm ? { passwordMismatch: true } : null;
    } },
  );

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.token = params.get('token')?.trim() ?? '';
        this.completed.set(false);
        this.errorMessage.set('');
        this.form.reset();

        if (!this.token) {
          this.validating.set(false);
          this.tokenInvalid.set(true);
          this.tokenErrorMessage.set('Open the password reset link from your email to continue.');
          return;
        }

        this.validating.set(true);
        this.tokenInvalid.set(false);
        this.validateToken();
      });
  }

  passwordMismatch(): boolean {
    const password = this.form.controls.newPassword.value;
    const confirm = this.form.controls.confirmPassword.value;
    return password.length > 0 && confirm.length > 0 && password !== confirm;
  }

  private validateToken(): void {
    this.authApi
      .validateResetToken(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.validating.set(false);
          this.tokenInvalid.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.validating.set(false);
          this.tokenInvalid.set(true);
          this.tokenErrorMessage.set(
            userFacingHttpError(error, 'This password reset link is invalid or has expired.'),
          );
        },
      });
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.loading() || this.passwordMismatch() || !this.token) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authApi
      .resetPassword({
        token: this.token,
        newPassword: this.form.controls.newPassword.value,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message);
          this.completed.set(true);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            userFacingHttpError(error, 'Unable to update your password. Please try again.'),
          );
          this.loading.set(false);
        },
      });
  }
}
