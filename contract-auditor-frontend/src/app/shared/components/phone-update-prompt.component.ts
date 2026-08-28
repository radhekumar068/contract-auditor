import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { UserApiService } from '../../core/services/user-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-phone-update-prompt',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="phone-prompt-title">
      <div class="modal" (click)="$event.stopPropagation()">
        <header>
          <h2 id="phone-prompt-title">Update Phone Number</h2>
        </header>
        <div class="content">
          <p>Please add your phone number to complete your profile.</p>
          @if (errorMessage()) {
            <div class="error" role="alert">{{ errorMessage() }}</div>
          }
          <form [formGroup]="form" (ngSubmit)="save()">
            <label>
              Phone Number
              <input type="tel" formControlName="phoneNumber" inputmode="numeric" autocomplete="tel" maxlength="15" />
              <span class="hint">10–15 digits, no spaces or symbols</span>
            </label>
            <footer>
              <button type="button" class="btn-secondary" (click)="remindLater()">Remind me later</button>
              <button type="button" class="btn-secondary" (click)="goToProfile()">Go to Profile</button>
              <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      overflow-y: auto;
    }
    .modal {
      background: #fff;
      border-radius: 16px;
      max-width: 480px;
      width: 100%;
      min-width: 0;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
      margin: auto;
    }
    header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    h2 { margin: 0; font-size: 1.125rem; color: #0f172a; }
    .content { padding: 1.5rem; }
    p { margin: 0 0 1rem; color: #334155; }
    form { display: grid; gap: 1rem; }
    label { display: grid; gap: 0.35rem; font-size: 0.875rem; color: #334155; }
    input {
      padding: 0.65rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .hint { font-size: 0.75rem; color: #94a3b8; }
    .error {
      background: #fef2f2;
      color: #b91c1c;
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .btn-primary {
      padding: 0.55rem 1rem;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary {
      padding: 0.55rem 1rem;
      background: #f1f5f9;
      color: #334155;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    @media (max-width: 640px) {
      footer { flex-direction: column-reverse; }
      footer .btn-primary,
      footer .btn-secondary { width: 100%; text-align: center; }
    }
  `],
})
export class PhoneUpdatePromptComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userApi = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly dismissed = output<void>();
  readonly saved = output<void>();

  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10,15}$/)]],
  });

  remindLater(): void {
    sessionStorage.setItem(AuthService.phonePromptDismissedKey, '1');
    this.dismissed.emit();
  }

  goToProfile(): void {
    sessionStorage.setItem(AuthService.phonePromptDismissedKey, '1');
    this.dismissed.emit();
    void this.router.navigate(['/profile']);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }
    const user = this.authService.currentUser();
    if (!user) {
      this.dismissed.emit();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.userApi.updateProfile({
      fullName: user.fullName,
      email: user.email,
      countryCode: user.countryCode,
      phoneNumber: this.form.controls.phoneNumber.value.trim(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const profile = response.profile;
          this.authService.setSession(response.accessToken, {
            ...user,
            fullName: profile.fullName,
            email: profile.email,
            countryCode: profile.countryCode,
            preferredCurrency: profile.preferredCurrency,
            phoneNumber: profile.phoneNumber ?? null,
          });
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Unable to save phone number.'));
        },
      });
  }
}
