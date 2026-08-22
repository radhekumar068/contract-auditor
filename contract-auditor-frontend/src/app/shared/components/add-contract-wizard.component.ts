import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BillingFrequency, VENDOR_PRESETS } from '../../core/models/contract.models';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { DEFAULT_CURRENCY } from '../../core/constants/countries';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-add-contract-wizard',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (open()) {
    <div class="overlay" (click)="onClose()" role="dialog" aria-modal="true">
      <div class="modal" (click)="$event.stopPropagation()">
        <header>
          <h2>Add Contract</h2>
          <button type="button" class="close-btn" (click)="onClose()" aria-label="Close">&times;</button>
        </header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <section class="presets">
            <span class="section-label">Popular vendors</span>
            <div class="chips">
              @for (preset of presets; track preset.name) {
                <button type="button" class="chip" (click)="applyPreset(preset)">{{ preset.name }}</button>
              }
            </div>
          </section>

          <div class="field">
            <label for="name">Name</label>
            <input id="name" formControlName="name" />
          </div>
          <div class="row">
            <div class="field">
              <label for="provider">Provider</label>
              <input id="provider" formControlName="provider" />
            </div>
            <div class="field">
              <label for="category">Category</label>
              <select id="category" formControlName="category">
                <option value="Software">Software</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Fitness">Fitness</option>
                <option value="Insurance">Insurance</option>
                <option value="Membership">Membership</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="amount">Amount</label>
              <input id="amount" type="number" step="0.01" formControlName="amount" />
            </div>
            <div class="field">
              <label for="billingFrequency">Billing Cycle</label>
              <select id="billingFrequency" formControlName="billingFrequency" (change)="recalculateDates()">
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="SEMI_ANNUAL">Semi-Annual</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="startDate">Start Date</label>
              <input id="startDate" type="date" formControlName="startDate" (change)="recalculateDates()" />
            </div>
            <div class="field">
              <label for="renewalDate">Next Renewal</label>
              <input id="renewalDate" type="date" formControlName="renewalDate" />
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="cancellationDeadlineDays">Cancel Deadline (days before renewal)</label>
              <input id="cancellationDeadlineDays" type="number" min="0" max="365" formControlName="cancellationDeadlineDays" />
            </div>
            <div class="field">
              <label for="status">Status</label>
              <select id="status" formControlName="status">
                <option value="ACTIVE">Active</option>
                <option value="TRIAL">Trial</option>
                <option value="PENDING_CANCEL">Pending Cancel</option>
              </select>
            </div>
          </div>

          @if (deadlineError()) {
            <p class="error">Cancellation deadline cannot be after the renewal date.</p>
          }

          <div class="field">
            <label for="cancellationWorkflow">Cancellation Workflow</label>
            <textarea id="cancellationWorkflow" formControlName="cancellationWorkflow" rows="2"></textarea>
          </div>

          @if (errorMessage()) {
            <p class="error">{{ errorMessage() }}</p>
          }

          <footer>
            <button type="button" class="btn-secondary" (click)="onClose()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || deadlineError() || saving()">
              {{ saving() ? 'Saving...' : 'Add Contract' }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; overflow-y: auto; }
    .modal { background: #fff; border-radius: 16px; max-width: 560px; width: 100%; box-shadow: 0 20px 60px rgba(15,23,42,.2); margin: auto; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
    h2 { margin: 0; font-size: 1.125rem; }
    form { padding: 1.5rem; display: grid; gap: 1rem; }
    .presets { display: grid; gap: .5rem; }
    .section-label { font-size: .8125rem; color: #64748b; font-weight: 600; }
    .chips { display: flex; flex-wrap: wrap; gap: .5rem; }
    .chip { padding: .35rem .75rem; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: .8125rem; cursor: pointer; font-weight: 500; }
    .chip:hover { background: #eff6ff; border-color: #2563eb; color: #2563eb; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: grid; gap: .35rem; }
    label { font-size: .8125rem; color: #64748b; font-weight: 500; }
    input, select, textarea { padding: .55rem .75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: .875rem; }
    input.ng-invalid.ng-touched, select.ng-invalid.ng-touched { border-color: #dc2626; }
    .error { color: #dc2626; font-size: .8125rem; margin: 0; }
    footer { display: flex; justify-content: flex-end; gap: .75rem; padding-top: .5rem; }
    .btn-primary { padding: .55rem 1rem; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary { padding: .55rem 1rem; background: #f1f5f9; color: #334155; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
  `],
})
export class AddContractWizardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly saved = output<void>();

  readonly presets = VENDOR_PRESETS;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    provider: ['', Validators.required],
    category: ['Software', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    billingFrequency: ['MONTHLY' as BillingFrequency, Validators.required],
    startDate: [this.todayIso(), Validators.required],
    renewalDate: ['', Validators.required],
    cancellationDeadlineDays: [3, [Validators.required, Validators.min(0), Validators.max(365)]],
    status: ['ACTIVE' as const, Validators.required],
    cancellationWorkflow: [''],
  });

  readonly deadlineError = computed(() => {
    const renewal = this.form.controls.renewalDate.value;
    const days = this.form.controls.cancellationDeadlineDays.value;
    if (!renewal || days == null) return false;
    const renewalDate = new Date(renewal);
    const deadline = new Date(renewalDate);
    deadline.setDate(deadline.getDate() - days);
    return deadline > renewalDate;
  });

  show(): void {
    this.errorMessage.set(null);
    this.form.reset({
      name: '',
      provider: '',
      category: 'Software',
      amount: 0,
      billingFrequency: 'MONTHLY',
      startDate: this.todayIso(),
      renewalDate: '',
      cancellationDeadlineDays: 3,
      status: 'ACTIVE',
      cancellationWorkflow: '',
    });
    this.recalculateDates();
    this.open.set(true);
  }

  onClose(): void {
    this.open.set(false);
  }

  applyPreset(preset: typeof VENDOR_PRESETS[number]): void {
    this.form.patchValue({
      name: preset.name,
      provider: preset.provider,
      category: preset.category,
      amount: preset.amount,
      billingFrequency: preset.billingFrequency,
      cancellationWorkflow: preset.cancellationWorkflow,
    });
    this.recalculateDates();
  }

  recalculateDates(): void {
    const startDate = this.form.controls.startDate.value;
    const frequency = this.form.controls.billingFrequency.value;
    if (!startDate) return;

    const start = new Date(startDate);
    const renewal = new Date(start);
    switch (frequency) {
      case 'WEEKLY': renewal.setDate(renewal.getDate() + 7); break;
      case 'MONTHLY': renewal.setMonth(renewal.getMonth() + 1); break;
      case 'QUARTERLY': renewal.setMonth(renewal.getMonth() + 3); break;
      case 'SEMI_ANNUAL': renewal.setMonth(renewal.getMonth() + 6); break;
      case 'ANNUAL': renewal.setFullYear(renewal.getFullYear() + 1); break;
    }
    this.form.controls.renewalDate.setValue(renewal.toISOString().slice(0, 10));
  }

  onSubmit(): void {
    if (this.form.invalid || this.deadlineError()) return;
    this.saving.set(true);
    this.errorMessage.set(null);

    const v = this.form.getRawValue();
    this.subscriptionService.create({
      name: v.name,
      provider: v.provider,
      category: v.category,
      status: v.status,
      commitmentType: 'SUBSCRIPTION',
      startDate: v.startDate,
      cancellationWorkflow: v.cancellationWorkflow || null,
      contractTerm: {
        billingFrequency: v.billingFrequency,
        amount: v.amount,
        currency: this.userCurrency(),
        renewalDate: v.renewalDate,
        cancellationDeadlineDays: v.cancellationDeadlineDays,
        autoRenew: true,
        isRefundable: false,
      },
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.open.set(false);
          this.saved.emit();
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Failed to save contract. Please try again.'));
        },
      });
  }

  private userCurrency(): string {
    return this.authService.currentUser()?.preferredCurrency || DEFAULT_CURRENCY;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
