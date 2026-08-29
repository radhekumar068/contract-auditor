import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DiscoveredSubscription, EmailConnectionStatus } from '../../core/models/contract.models';
import { EmailDiscoveryApiService } from '../../core/services/email-discovery-api.service';
import { userFacingHttpError } from '../../core/utils/http-error';
import { VendorAvatarComponent } from './vendor-avatar.component';
import { MoneyPipe } from '../pipes/money.pipe';

type WizardStep = 'connect' | 'scan' | 'review';

@Component({
  selector: 'app-discover-from-email',
  standalone: true,
  imports: [DatePipe, FormsModule, VendorAvatarComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="overlay" (click)="onClose()" role="dialog" aria-modal="true" aria-labelledby="discover-title">
        <div class="modal" (click)="$event.stopPropagation()">
          <header>
            <h2 id="discover-title">Discover from Email</h2>
            <button type="button" class="close-btn" (click)="onClose()" aria-label="Close">&times;</button>
          </header>

          @if (errorMessage()) {
            <p class="error-banner">{{ errorMessage() }}</p>
          }

          @if (!status()?.featureEnabled) {
            <section class="step">
              <p>Email discovery is not enabled on this server. You can still add subscriptions manually.</p>
            </section>
          } @else if (step() === 'connect') {
            <section class="step">
              <p>Connect your Gmail account (read-only) to find subscription receipts for Netflix, Prime, Hotstar, and more.</p>
              @if (status()?.connected) {
                <p class="connected">Connected: <strong>{{ status()?.emailAddress }}</strong></p>
                <div class="actions">
                  <button type="button" class="btn-primary" (click)="goToScan()" [disabled]="busy()">Scan inbox</button>
                  <button type="button" class="btn-secondary" (click)="disconnect()" [disabled]="busy()">Disconnect</button>
                </div>
              } @else {
                <button type="button" class="btn-primary" (click)="connectGmail()" [disabled]="busy()">
                  {{ busy() ? 'Redirecting...' : 'Connect Gmail' }}
                </button>
              }
            </section>
          } @else if (step() === 'scan') {
            <section class="step">
              <p>Scanning your inbox for subscription billing emails...</p>
              @if (busy()) {
                <p class="muted">This may take a moment.</p>
              }
            </section>
          } @else {
            <section class="step review">
              <p>Found {{ suggestions().length }} possible subscription(s). Select items to import.</p>
              @if (suggestions().length === 0) {
                <p class="muted">No subscription emails matched our vendor rules. Try adding contracts manually.</p>
              } @else {
                <ul class="suggestion-list">
                  @for (item of suggestions(); track item.vendorKey) {
                    <li [class.disabled]="item.alreadyExists">
                      <label>
                        <input
                          type="checkbox"
                          [checked]="isSelected(item.vendorKey)"
                          [disabled]="item.alreadyExists"
                          (change)="toggleSelection(item.vendorKey, $event)"
                        />
                        <app-vendor-avatar [name]="item.provider" [category]="item.category" />
                        <span class="details">
                          <strong>{{ item.name }}</strong>
                          <span>{{ item.amount | money }} / {{ formatBilling(item.billingFrequency) }}</span>
                          <span class="muted">Renews {{ item.renewalDate | date:'mediumDate' }}</span>
                          <span class="muted subject">{{ item.sourceSubject }}</span>
                        </span>
                        @if (item.alreadyExists) {
                          <span class="badge">Already added</span>
                        }
                      </label>
                    </li>
                  }
                </ul>
              }
              <div class="actions">
                <button type="button" class="btn-secondary" (click)="step.set('connect')" [disabled]="busy()">Back</button>
                <button
                  type="button"
                  class="btn-primary"
                  (click)="importSelected()"
                  [disabled]="busy() || selectedCount() === 0"
                >
                  {{ busy() ? 'Importing...' : 'Import selected (' + selectedCount() + ')' }}
                </button>
              </div>
            </section>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal { background: #fff; border-radius: 12px; width: min(640px, 100%); max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(15,23,42,.2); }
    header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
    h2 { margin: 0; font-size: 1.25rem; color: #0f172a; }
    .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; line-height: 1; }
    .step { padding: 1.5rem; display: grid; gap: 1rem; }
    .connected { color: #166534; background: #dcfce7; padding: .75rem 1rem; border-radius: 8px; margin: 0; }
    .error-banner { margin: 0 1.5rem; padding: .75rem 1rem; background: #fef2f2; color: #dc2626; border-radius: 8px; }
    .muted { color: #64748b; font-size: .875rem; }
    .actions { display: flex; gap: .75rem; flex-wrap: wrap; }
    .btn-primary { padding: .55rem 1rem; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary { padding: .55rem 1rem; background: #fff; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .suggestion-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .75rem; }
    .suggestion-list li { border: 1px solid #e2e8f0; border-radius: 10px; }
    .suggestion-list li.disabled { opacity: .65; background: #f8fafc; }
    .suggestion-list label { display: flex; align-items: flex-start; gap: .75rem; padding: 1rem; cursor: pointer; }
    .details { display: grid; gap: .2rem; flex: 1; }
    .details strong { color: #0f172a; }
    .subject { font-size: .75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
    .badge { font-size: .75rem; font-weight: 600; color: #92400e; background: #fef3c7; padding: .2rem .5rem; border-radius: 999px; white-space: nowrap; }
  `],
})
export class DiscoverFromEmailComponent {
  private readonly emailDiscoveryApi = inject(EmailDiscoveryApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = signal(false);
  readonly busy = signal(false);
  readonly step = signal<WizardStep>('connect');
  readonly status = signal<EmailConnectionStatus | null>(null);
  readonly suggestions = signal<DiscoveredSubscription[]>([]);
  readonly selectedKeys = signal<Set<string>>(new Set());
  readonly errorMessage = signal<string | null>(null);
  readonly imported = output<void>();

  readonly selectedCount = computed(() => this.selectedKeys().size);

  show(startAtReview = false): void {
    this.errorMessage.set(null);
    this.suggestions.set([]);
    this.selectedKeys.set(new Set());
    this.step.set(startAtReview ? 'review' : 'connect');
    this.open.set(true);
    this.loadStatus(startAtReview);
  }

  onClose(): void {
    if (!this.busy()) {
      this.open.set(false);
    }
  }

  connectGmail(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.emailDiscoveryApi.getAuthUrl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          window.location.href = response.authUrl;
        },
        error: (error) => {
          this.busy.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Unable to start Gmail connection.'));
        },
      });
  }

  goToScan(): void {
    this.step.set('scan');
    this.busy.set(true);
    this.errorMessage.set(null);
    this.emailDiscoveryApi.scan()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.suggestions.set(result.suggestions);
          const preselected = new Set(
            result.suggestions
              .filter((s) => !s.alreadyExists && s.confidence >= 0.7)
              .map((s) => s.vendorKey),
          );
          this.selectedKeys.set(preselected);
          this.busy.set(false);
          this.step.set('review');
        },
        error: (error) => {
          this.busy.set(false);
          this.step.set('connect');
          this.errorMessage.set(userFacingHttpError(error, 'Inbox scan failed. Please try again.'));
        },
      });
  }

  importSelected(): void {
    const selected = this.suggestions().filter((s) => this.selectedKeys().has(s.vendorKey));
    if (selected.length === 0) return;

    this.busy.set(true);
    this.errorMessage.set(null);
    this.emailDiscoveryApi.importSelected(selected)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.open.set(false);
          this.imported.emit();
        },
        error: (error) => {
          this.busy.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Import failed. Please try again.'));
        },
      });
  }

  disconnect(): void {
    this.busy.set(true);
    this.emailDiscoveryApi.disconnect()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.loadStatus(false);
        },
        error: (error) => {
          this.busy.set(false);
          this.errorMessage.set(userFacingHttpError(error, 'Failed to disconnect Gmail.'));
        },
      });
  }

  isSelected(vendorKey: string): boolean {
    return this.selectedKeys().has(vendorKey);
  }

  toggleSelection(vendorKey: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedKeys());
    if (checked) {
      next.add(vendorKey);
    } else {
      next.delete(vendorKey);
    }
    this.selectedKeys.set(next);
  }

  formatBilling(freq: string): string {
    return freq.replaceAll('_', ' ').toLowerCase();
  }

  private loadStatus(autoScan: boolean): void {
    this.emailDiscoveryApi.getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.status.set(status);
          if (autoScan && status.connected) {
            this.goToScan();
          }
        },
        error: () => {
          this.status.set({ featureEnabled: false, connected: false, emailAddress: null, connectedAt: null, lastSyncAt: null });
        },
      });
  }
}
