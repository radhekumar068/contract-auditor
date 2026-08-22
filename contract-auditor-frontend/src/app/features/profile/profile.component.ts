import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { COUNTRIES, countryName, currencyForCountry, DEFAULT_COUNTRY_CODE } from '../../core/constants/countries';
import { Profile, User, UserRole } from '../../core/models/contract.models';
import { AuthService } from '../../core/services/auth.service';
import { UserApiService } from '../../core/services/user-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="profile-page">
      <header class="page-header">
        <h1>{{ displayName() }}</h1>
        <p>Update and manage your account details</p>
      </header>

      @if (errorMessage()) {
        <div class="banner error" role="alert">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="banner success" role="status">{{ successMessage() }}</div>
      }

      @if (loading()) {
        <p class="empty">Loading profile...</p>
      } @else {
        @if (profile(); as current) {
        <section class="identity-card">
          <div class="identity-left">
            <div class="avatar" aria-hidden="true">{{ initials() }}</div>
            <div class="identity-text">
              <h2>{{ current.fullName }}</h2>
              <p>{{ current.email }}</p>
            </div>
            <span class="badge" [class.admin]="current.role === 'ADMIN'">{{ roleLabel(current.role) }}</span>
          </div>
          <button type="button" class="btn-logout" (click)="logout()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </section>

        <div class="columns">
          <section class="card">
            <h3>Personal Information</h3>
            <form [formGroup]="profileForm" (ngSubmit)="saveChanges()">
              <div class="field-row">
                <div>
                  <span class="label">Full Name</span>
                  @if (editingName()) {
                    <input type="text" formControlName="fullName" maxlength="255" />
                  } @else {
                    <strong>{{ profileForm.controls.fullName.value }}</strong>
                  }
                </div>
                <button type="button" class="btn-icon" (click)="toggleEdit('name')" aria-label="Edit full name">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                </button>
              </div>
              <div class="field-row">
                <div>
                  <span class="label">Contact Email</span>
                  @if (editingEmail()) {
                    <input type="email" formControlName="email" maxlength="255" />
                  } @else {
                    <strong>{{ profileForm.controls.email.value }}</strong>
                  }
                </div>
                <button type="button" class="btn-icon" (click)="toggleEdit('email')" aria-label="Edit email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                </button>
              </div>
              <div class="field-row">
                <div>
                  <span class="label">Country</span>
                  @if (editingCountry()) {
                    <select formControlName="countryCode">
                      @for (country of countries; track country.code) {
                        <option [value]="country.code">{{ country.name }} ({{ country.currency }})</option>
                      }
                    </select>
                  } @else {
                    <strong>{{ countryLabel(profileForm.controls.countryCode.value) }}</strong>
                  }
                </div>
                <button type="button" class="btn-icon" (click)="toggleEdit('country')" aria-label="Edit country">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                </button>
              </div>
              <div class="field-row">
                <div>
                  <span class="label">Active Role</span>
                  <strong>{{ roleLabel(current.role) }}</strong>
                </div>
              </div>
              <div class="field-row last">
                <div>
                  <span class="label">Account Created</span>
                  <strong>
                    @if (current.createdAt) {
                      {{ current.createdAt | date:'MMMM d, y' }}
                    } @else {
                      —
                    }
                  </strong>
                </div>
              </div>
            </form>
          </section>

          <div class="right-stack">
            <section class="card">
              <h3>Account Security</h3>
              <button type="button" class="btn-outline full" (click)="openPasswordModal()">Change Password</button>
            </section>
            <section class="card">
              <h3>Recent Activity</h3>
              <div class="activity-row">
                <span>Last Login</span>
                <strong>
                  @if (current.lastLoginAt) {
                    {{ current.lastLoginAt | date:'HH:mm EEEE, MMM d, y' }}
                  } @else {
                    —
                  }
                </strong>
              </div>
              <div class="activity-row">
                <span>Active Devices</span>
                <strong>{{ current.activeDeviceCount }}</strong>
              </div>
            </section>
          </div>
        </div>

        <div class="footer-actions">
          <button
            type="button"
            class="btn-save"
            [disabled]="profileForm.invalid || profileForm.pristine || saving()"
            (click)="saveChanges()"
          >
            {{ saving() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      } @else {
        <p class="empty">No profile data found. Please sign in again.</p>
        }
      }
    </div>

    @if (passwordOpen()) {
      <div class="modal-backdrop" (click)="closePasswordModal()"></div>
      <div class="modal" role="dialog" aria-labelledby="password-title">
        <h2 id="password-title">Change Password</h2>
        <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()">
          <label>
            Current password
            <input type="password" formControlName="currentPassword" autocomplete="current-password" />
          </label>
          <label>
            New password
            <input type="password" formControlName="newPassword" autocomplete="new-password" />
          </label>
          <label>
            Confirm new password
            <input type="password" formControlName="confirmPassword" autocomplete="new-password" />
          </label>
          @if (passwordForm.errors?.['mismatch'] && passwordForm.touched) {
            <p class="field-error">New passwords do not match.</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn-outline" (click)="closePasswordModal()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="passwordForm.invalid || passwordSaving()">
              {{ passwordSaving() ? 'Updating...' : 'Update Password' }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .profile-page { max-width: 1080px; }
    .page-header { margin-bottom: 1.25rem; }
    h1 { margin: 0; color: #0f172a; font-size: 1.85rem; }
    h2 { margin: 0; color: #0f172a; font-size: 1.15rem; }
    h3 { margin: 0 0 1rem; color: #0f172a; font-size: 1.05rem; font-weight: 700; }
    p { margin: 0.35rem 0 0; color: #64748b; }
    .banner { padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.9rem; }
    .banner.error { background: #fef2f2; color: #b91c1c; }
    .banner.success { background: #ecfdf5; color: #047857; }
    .identity-card,
    .card {
      background: #fff;
      border-radius: 14px;
      padding: 1.35rem 1.5rem;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
    }
    .identity-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .identity-left { display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 16rem; }
    .identity-text p { margin: 0.15rem 0 0; }
    .avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: #2563eb; color: #fff;
      font-size: 1rem; font-weight: 700; letter-spacing: 0.04em;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .badge {
      display: inline-block; padding: 0.2rem 0.65rem;
      background: #eff6ff; color: #2563eb;
      border-radius: 999px; font-size: 0.75rem; font-weight: 600;
    }
    .badge.admin { background: #f5f3ff; color: #6d28d9; }
    .columns {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 1rem;
      align-items: start;
    }
    .right-stack { display: grid; gap: 1rem; }
    .field-row {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem;
      padding: 0.95rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .field-row.last { border-bottom: 0; padding-bottom: 0; }
    .field-row .label { display: block; font-size: 0.78rem; color: #94a3b8; margin-bottom: 0.25rem; }
    .field-row strong { color: #0f172a; font-weight: 600; word-break: break-word; }
    .field-row input, .field-row select {
      padding: 0.4rem 0.55rem; border: 1px solid #cbd5e1; border-radius: 8px;
      font-size: 0.95rem; min-width: 16rem; max-width: 100%;
    }
    .btn-icon {
      width: 32px; height: 32px; border: 0; background: transparent; color: #94a3b8;
      border-radius: 8px; cursor: pointer; display: grid; place-items: center;
    }
    .btn-icon svg { width: 16px; height: 16px; }
    .btn-icon:hover { background: #f1f5f9; color: #334155; }
    .activity-row {
      display: flex; justify-content: space-between; gap: 1rem;
      padding: 0.65rem 0; color: #64748b; font-size: 0.92rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .activity-row:last-child { border-bottom: 0; }
    .activity-row strong { color: #0f172a; }
    .footer-actions { display: flex; justify-content: flex-end; margin-top: 1.25rem; }
    .btn-logout, .btn-outline, .btn-save, .btn-primary {
      border-radius: 10px; font-weight: 600; cursor: pointer;
    }
    .btn-logout, .btn-outline, .btn-save {
      padding: 0.6rem 1rem; border: 1px solid #e2e8f0; background: #fff; color: #0f172a;
    }
    .btn-logout { display: inline-flex; align-items: center; gap: 0.4rem; color: #475569; }
    .btn-logout:hover { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .btn-outline.full { width: 100%; padding: 0.85rem 1rem; }
    .btn-outline:hover, .btn-save:hover { background: #f8fafc; }
    .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary {
      padding: 0.6rem 1rem; border: 0; background: #2563eb; color: #fff;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .empty { color: #64748b; text-align: center; padding: 2rem; }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 50;
    }
    .modal {
      position: fixed; z-index: 51; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: min(420px, calc(100vw - 2rem)); background: #fff; border-radius: 14px;
      padding: 1.5rem; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
    }
    .modal form { display: grid; gap: 0.85rem; margin-top: 1rem; }
    .modal label { display: grid; gap: 0.35rem; font-size: 0.85rem; color: #334155; }
    .modal input { padding: 0.65rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 0.4rem; }
    .field-error { margin: 0; color: #b91c1c; font-size: 0.85rem; }
    @media (max-width: 860px) {
      .columns { grid-template-columns: 1fr; }
      .field-row input, .field-row select { min-width: 0; width: 100%; }
    }
  `],
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userApi = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly user = this.authService.currentUser;
  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly passwordSaving = signal(false);
  readonly passwordOpen = signal(false);
  readonly editingName = signal(false);
  readonly editingEmail = signal(false);
  readonly editingCountry = signal(false);
  readonly countries = COUNTRIES;
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    countryCode: [DEFAULT_COUNTRY_CODE, [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: ProfileComponent.passwordsMatch });

  readonly displayName = computed(() => this.profile()?.fullName || this.user()?.fullName || 'Your');
  readonly initials = computed(() => this.toInitials(this.profile()?.fullName || this.user()?.fullName || ''));

  ngOnInit(): void {
    this.userApi.getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => this.applyProfile(profile),
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Unable to load profile.'));
        },
      });
  }

  toggleEdit(field: 'name' | 'email' | 'country'): void {
    if (field === 'name') {
      this.editingName.update((value) => !value);
    } else if (field === 'email') {
      this.editingEmail.update((value) => !value);
    } else {
      this.editingCountry.update((value) => !value);
    }
  }

  saveChanges(): void {
    if (this.profileForm.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const payload = {
      fullName: this.profileForm.controls.fullName.value.trim(),
      email: this.profileForm.controls.email.value.trim().toLowerCase(),
      countryCode: this.profileForm.controls.countryCode.value,
    };
    this.userApi.updateProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.applyProfile(response.profile, response.accessToken);
          this.editingName.set(false);
          this.editingEmail.set(false);
          this.editingCountry.set(false);
          this.saving.set(false);
          this.successMessage.set('Profile changes saved.');
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Unable to save profile changes.'));
        },
      });
  }

  openPasswordModal(): void {
    this.passwordForm.reset();
    this.passwordOpen.set(true);
  }

  closePasswordModal(): void {
    this.passwordOpen.set(false);
  }

  submitPassword(): void {
    if (this.passwordForm.invalid || this.passwordSaving()) {
      return;
    }
    this.passwordSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.userApi.changePassword({ currentPassword, newPassword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.passwordSaving.set(false);
          this.passwordOpen.set(false);
          this.successMessage.set('Password updated successfully.');
        },
        error: (error: HttpErrorResponse) => {
          this.passwordSaving.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Unable to change password.'));
        },
      });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/');
  }

  countryLabel(countryCode: string): string {
    return `${countryName(countryCode)} (${currencyForCountry(countryCode)})`;
  }

  roleLabel(role: UserRole): string {
    return role === 'ADMIN' ? 'Admin' : 'Member';
  }

  private applyProfile(profile: Profile, accessToken?: string): void {
    this.profile.set(profile);
    this.profileForm.reset({
      fullName: profile.fullName,
      email: profile.email,
      countryCode: profile.countryCode || DEFAULT_COUNTRY_CODE,
    });
    this.loading.set(false);
    const existing = this.user();
    const nextUser: User = {
      id: existing?.id ?? 0,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      createdAt: profile.createdAt,
      lastLoginAt: profile.lastLoginAt,
      countryCode: profile.countryCode || DEFAULT_COUNTRY_CODE,
      preferredCurrency: profile.preferredCurrency || currencyForCountry(profile.countryCode),
    };
    if (accessToken) {
      this.authService.setSession(accessToken, nextUser);
    } else {
      this.authService.updateCurrentUser(nextUser);
    }
  }

  private toInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  private static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const next = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return next && confirm && next !== confirm ? { mismatch: true } : null;
  }
}
