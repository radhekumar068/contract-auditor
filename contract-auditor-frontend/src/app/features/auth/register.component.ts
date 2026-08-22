import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { COUNTRIES } from '../../core/constants/countries';
import { UserRole } from '../../core/models/contract.models';
import { AuthApiService } from '../../core/services/auth-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-card">
      <a routerLink="/" class="back">← Back to home</a>
      <h1>Create Account</h1>
      <p class="subtitle">Start tracking renewals, trials, and cancellation windows</p>

      @if (errorMessage()) {
        <div class="error">{{ errorMessage() }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>
          Full Name
          <input type="text" formControlName="fullName" autocomplete="name" />
        </label>
        <label>
          Email
          <input type="email" formControlName="email" autocomplete="email" />
        </label>
        <label>
          Password
          <input type="password" formControlName="password" autocomplete="new-password" />
        </label>
        <label>
          Country
          <select formControlName="countryCode">
            <option value="">Select country</option>
            @for (country of countries; track country.code) {
              <option [value]="country.code">{{ country.name }} ({{ country.currency }})</option>
            }
          </select>
        </label>
        <label>
          Role
          <select formControlName="role">
            @for (role of roles; track role) {
              <option [value]="role">{{ role }}</option>
            }
          </select>
        </label>
        <button type="submit" [disabled]="form.invalid || loading()">Register</button>
      </form>

      <p class="footer">Already registered? <a routerLink="/login">Sign in</a></p>
    </div>
  `,
  styles: [`
    .auth-card { max-width: 420px; margin: 4rem auto; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(15,23,42,.08); }
    h1 { margin: 0 0 .5rem; color: #0f172a; }
    .subtitle { color: #64748b; margin-bottom: 1.5rem; }
    form { display: grid; gap: 1rem; }
    label { display: grid; gap: .35rem; font-size: .875rem; color: #334155; }
    input, select { padding: .65rem .75rem; border: 1px solid #cbd5e1; border-radius: 8px; }
    button { padding: .75rem; border: 0; border-radius: 8px; background: #2563eb; color: #fff; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .error { background: #fef2f2; color: #b91c1c; padding: .75rem; border-radius: 8px; margin-bottom: 1rem; }
    .back { display: inline-block; margin-bottom: 1rem; font-size: .875rem; }
    .footer { margin-top: 1rem; text-align: center; color: #64748b; }
    a { color: #2563eb; text-decoration: none; }
  `],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly countries = COUNTRIES;
  readonly roles: UserRole[] = ['USER', 'ADMIN'];

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    countryCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    role: this.fb.nonNullable.control<UserRole>('USER', [Validators.required]),
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.authApi.register(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(userFacingHttpError(err, 'Registration failed. Please try again.'));
        },
      });
  }
}
