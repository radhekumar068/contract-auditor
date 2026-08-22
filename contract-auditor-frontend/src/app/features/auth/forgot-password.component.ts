import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from '../../shared/components/public-header.component';

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
            <div class="notice">
              If an account exists for that email, your workspace administrator can restore access.
              Password reset email is not enabled in this environment, so please sign in if you still have credentials
              or create a new account.
            </div>
            <div class="links">
              <a routerLink="/login" class="btn navy">Back to Sign In</a>
              <a routerLink="/register" class="btn green">Create Account</a>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()">
              <label>
                Email
                <input type="email" formControlName="email" autocomplete="email" />
              </label>
              <button type="submit" [disabled]="form.invalid">Continue</button>
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
    .notice { background: #eff6ff; color: #1e3a8a; padding: .85rem; border-radius: 8px; margin-bottom: 1rem; line-height: 1.45; }
    .footer { margin-top: 1rem; text-align: center; color: #64748b; }
    a { color: #0b9a6d; text-decoration: none; }
  `],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  readonly submitted = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.submitted.set(true);
  }
}
