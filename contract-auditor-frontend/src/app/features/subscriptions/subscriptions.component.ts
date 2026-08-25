import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, startWith } from 'rxjs';
import { BillingFrequency, Subscription, SubscriptionStatus } from '../../core/models/contract.models';
import { SubscriptionService } from '../../core/services/subscription.service';
import { userFacingHttpError } from '../../core/utils/http-error';
import { VendorAvatarComponent } from '../../shared/components/vendor-avatar.component';
import { AddContractWizardComponent } from '../../shared/components/add-contract-wizard.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, VendorAvatarComponent, AddContractWizardComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="subscriptions-page">
      <header class="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p>Manage all your recurring commitments in one place</p>
        </div>
        <button type="button" class="btn-primary" (click)="openWizard()">Add Contract</button>
      </header>

      <div class="toolbar">
        <input type="search" placeholder="Search vendors..." [formControl]="searchControl" class="search" />
        <select [formControl]="statusControl">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="PENDING_CANCEL">Pending Cancel</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select [formControl]="billingControl">
          <option value="">All Billing Cycles</option>
          <option value="MONTHLY">Monthly</option>
          <option value="ANNUAL">Annual</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="WEEKLY">Weekly</option>
        </select>
        <select [formControl]="categoryControl">
          <option value="">All Categories</option>
          @for (cat of categories(); track cat) {
            <option [value]="cat">{{ cat }}</option>
          }
        </select>
        <div class="view-toggle">
          <button type="button" [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')">List</button>
          <button type="button" [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')">Grid</button>
        </div>
      </div>

      @if (loading()) {
        <p class="loading">Loading subscriptions...</p>
      } @else if (loadError()) {
        <div class="error-state">
          <p>{{ loadError() }}</p>
          <button type="button" class="btn-retry" (click)="loadSubscriptions()">Retry</button>
        </div>
      } @else if (filtered().length === 0) {
        <p class="empty">No subscriptions match your filters.</p>
      } @else if (viewMode() === 'list') {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Category</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Billing</th>
                <th>Next Renewal</th>
                <th>Cancel By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (sub of filtered(); track sub.id) {
                <tr>
                  <td class="vendor-cell">
                    <app-vendor-avatar [name]="sub.provider" [category]="sub.category" />
                    <div>
                      <strong>{{ sub.name }}</strong>
                      <span>{{ sub.provider }}</span>
                    </div>
                  </td>
                  <td>{{ sub.category }}</td>
                  <td><span class="status-badge" [class]="sub.status.toLowerCase()">{{ formatStatus(sub.status) }}</span></td>
                  <td>{{ sub.contractTerm.amount | money }}</td>
                  <td>{{ formatBilling(sub.contractTerm.billingFrequency) }}</td>
                  <td>{{ sub.contractTerm.renewalDate | date:'mediumDate' }}</td>
                  <td>{{ sub.contractTerm.cancellationDeadlineDate | date:'mediumDate' }}</td>
                  <td>
                    <button type="button" class="btn-icon" (click)="onDelete(sub.id)" title="Delete">✕</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="grid-view">
          @for (sub of filtered(); track sub.id) {
            <article class="sub-card">
              <div class="card-top">
                <app-vendor-avatar [name]="sub.provider" [category]="sub.category" />
                <span class="status-badge" [class]="sub.status.toLowerCase()">{{ formatStatus(sub.status) }}</span>
              </div>
              <h3>{{ sub.name }}</h3>
              <p class="provider">{{ sub.provider }} · {{ sub.category }}</p>
              <p class="amount">{{ sub.contractTerm.amount | money }} / {{ formatBilling(sub.contractTerm.billingFrequency) }}</p>
              <p class="renewal">Renews {{ sub.contractTerm.renewalDate | date:'mediumDate' }}</p>
              <button type="button" class="btn-delete" (click)="onDelete(sub.id)">Remove</button>
            </article>
          }
        </div>
      }

      <app-add-contract-wizard #wizard (saved)="loadSubscriptions()" />
    </div>
  `,
  styles: [`
    .subscriptions-page { display: grid; gap: 1.5rem; max-width: 1200px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    h1 { margin: 0; color: #0f172a; }
    p { margin: .35rem 0 0; color: #64748b; }
    .btn-primary { padding: .55rem 1rem; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .toolbar { display: flex; gap: .75rem; flex-wrap: wrap; align-items: center; }
    .search { flex: 1; min-width: 200px; padding: .55rem .75rem; border: 1px solid #cbd5e1; border-radius: 8px; }
    select { padding: .55rem .75rem; border: 1px solid #cbd5e1; border-radius: 8px; }
    .view-toggle { display: flex; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .view-toggle button { padding: .5rem .85rem; border: none; background: #fff; cursor: pointer; font-weight: 500; font-size: .8125rem; color: #64748b; }
    .view-toggle button.active { background: #2563eb; color: #fff; }
    .table-wrap { background: #fff; border-radius: 12px; overflow-x: auto; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
    table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    th { text-align: left; padding: .85rem 1rem; background: #f8fafc; color: #64748b; font-weight: 600; font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; }
    td { padding: .85rem 1rem; border-top: 1px solid #f1f5f9; color: #334155; }
    .vendor-cell { display: flex; align-items: center; gap: .75rem; }
    .vendor-cell strong { display: block; color: #0f172a; }
    .vendor-cell span { font-size: .75rem; color: #64748b; }
    .status-badge { padding: .2rem .55rem; border-radius: 999px; font-size: .75rem; font-weight: 600; }
    .status-badge.active { background: #dcfce7; color: #166534; }
    .status-badge.trial { background: #e0e7ff; color: #3730a3; }
    .status-badge.pending_cancel { background: #fef3c7; color: #92400e; }
    .status-badge.cancelled { background: #f1f5f9; color: #64748b; }
    .btn-icon { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1rem; }
    .btn-icon:hover { color: #dc2626; }
    .grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .sub-card { background: #fff; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(15,23,42,.08); transition: transform .2s, box-shadow .2s; }
    .sub-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15,23,42,.1); }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: .75rem; }
    h3 { margin: 0 0 .25rem; color: #0f172a; }
    .provider { font-size: .8125rem; color: #64748b; margin: 0 0 .5rem; }
    .amount { font-weight: 600; color: #0f172a; margin: 0 0 .25rem; }
    .renewal { font-size: .8125rem; color: #64748b; margin: 0 0 1rem; }
    .btn-delete { padding: .4rem .75rem; border: 1px solid #fecaca; background: #fff; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: .8125rem; }
    .loading, .empty { color: #64748b; background: #fff; padding: 2rem; border-radius: 12px; text-align: center; }
    .error-state { background: #fff; padding: 2rem; border-radius: 12px; text-align: center; }
    .error-state p { color: #64748b; margin: 0 0 1rem; }
    .btn-retry { padding: 0.5rem 1rem; background: #4f61c8; color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }

    @media (max-width: 768px) {
      .subscriptions-page { gap: 1.25rem; }
      .page-header { align-items: stretch; }
      .page-header .btn-primary { width: 100%; }
      .toolbar { flex-direction: column; align-items: stretch; }
      .search { min-width: 0; width: 100%; }
      .toolbar select { width: 100%; }
      .view-toggle { align-self: flex-start; }
    }
  `],
})
export class SubscriptionsComponent {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly wizard = viewChild.required<AddContractWizardComponent>('wizard');

  readonly subscriptions = signal<Subscription[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly viewMode = signal<'list' | 'grid'>('list');

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl('', { nonNullable: true });
  readonly billingControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl('', { nonNullable: true });

  readonly categories = computed(() =>
    [...new Set(this.subscriptions().map((s) => s.category))].sort()
  );

  readonly filtered = signal<Subscription[]>([]);

  constructor() {
    this.loadSubscriptions();

    combineLatest([
      toObservable(this.subscriptions),
      this.searchControl.valueChanges.pipe(startWith('')),
      this.statusControl.valueChanges.pipe(startWith('')),
      this.billingControl.valueChanges.pipe(startWith('')),
      this.categoryControl.valueChanges.pipe(startWith('')),
    ]).pipe(
      map(([subs, search, status, billing, category]) =>
        subs.filter((s) => {
          const q = search.toLowerCase();
          const matchesSearch = !q ||
            s.name.toLowerCase().includes(q) ||
            s.provider.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q);
          const matchesStatus = !status || s.status === status;
          const matchesBilling = !billing || s.contractTerm.billingFrequency === billing;
          const matchesCategory = !category || s.category === category;
          return matchesSearch && matchesStatus && matchesBilling && matchesCategory;
        })
      ),
      takeUntilDestroyed(),
    ).subscribe((result) => this.filtered.set(result));
  }

  openWizard(): void {
    this.wizard().show();
  }

  formatStatus(status: SubscriptionStatus): string {
    return status.replaceAll('_', ' ');
  }

  formatBilling(freq: BillingFrequency): string {
    return freq.replaceAll('_', ' ').toLowerCase();
  }

  onDelete(id: number): void {
    if (!confirm('Delete this subscription?')) return;
    this.subscriptionService.delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadSubscriptions());
  }

  loadSubscriptions(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.subscriptionService.listAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subs) => {
          this.subscriptions.set(subs);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.loadError.set(userFacingHttpError(error, 'Unable to load subscriptions. Please try again.'));
        },
      });
  }
}
