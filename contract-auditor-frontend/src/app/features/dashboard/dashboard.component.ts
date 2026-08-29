import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '../../core/services/analytics.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { userFacingHttpError } from '../../core/utils/http-error';
import { Dashboard, UrgentAction } from '../../core/models/contract.models';
import { HealthGaugeComponent } from '../../shared/components/health-gauge.component';
import { DonutChartComponent } from '../../shared/components/donut-chart.component';
import { UrgentActionCardsComponent } from '../../shared/components/urgent-action-cards.component';
import { CancelAssistantModalComponent } from '../../shared/components/cancel-assistant-modal.component';
import { AddContractWizardComponent } from '../../shared/components/add-contract-wizard.component';
import { MonthlyTrendChartComponent } from '../../shared/components/monthly-trend-chart.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

interface MetricTrend {
  change: number;
  positive: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DecimalPipe,
    HealthGaugeComponent,
    DonutChartComponent,
    UrgentActionCardsComponent,
    CancelAssistantModalComponent,
    AddContractWizardComponent,
    MonthlyTrendChartComponent,
    LoadingSpinnerComponent,
    MoneyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard">
      <header class="page-header">
        <div>
          <h1>Financial Leakage Dashboard</h1>
          <p>Track recurring costs, leakage, and urgent cancellation windows.</p>
        </div>
        <div class="actions">
          <select [value]="selectedYear()" (change)="onYearChange($event)">
            @for (year of years; track year) {
              <option [value]="year">{{ year }}</option>
            }
          </select>
          <div class="period-toggle">
            <button type="button" [class.active]="!yearlyView()" (click)="yearlyView.set(false)">Monthly</button>
            <button type="button" [class.active]="yearlyView()" (click)="yearlyView.set(true)">Yearly</button>
          </div>
          <button type="button" class="btn-primary" (click)="openWizard()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Contract
          </button>
        </div>
      </header>

      @if (dashboard(); as data) {
        <section class="top-row">
          <app-health-gauge [score]="data.healthScore" />
          <div class="leakage-card">
            <h3>Financial Leakage</h3>
            <div class="leakage-meter">
              <div class="leakage-fill" [style.width.%]="leakagePercent()"></div>
            </div>
            <strong class="leakage-amount">{{ toDisplayValue(data.financialLeakage) | money }}</strong>
            <p class="leakage-sub">Lost to price hikes &amp; unused subscriptions</p>
          </div>
          <div class="metrics-stack">
            <div class="metrics-row">
              <article class="metric-card">
                <div class="metric-header">
                  <span class="label">{{ yearlyView() ? 'Annual Cost' : 'Monthly Average' }}</span>
                  @if (monthlyAvgTrend(); as trend) {
                    <span class="badge" [class.up]="trend.positive" [class.down]="!trend.positive">
                      {{ trend.positive ? '\u2191' : '\u2193' }} {{ trend.change | number:'1.2-2' }}%
                    </span>
                  }
                </div>
                <strong class="animated-value">{{ (yearlyView() ? data.totalAnnualCost : data.monthlyAverage) | money }}</strong>
              </article>
              <article class="metric-card savings">
                <div class="metric-header">
                  <span class="label">Potential Savings</span>
                  @if (savingsTrend(); as trend) {
                    <span class="badge savings-badge" [class.up]="!trend.positive" [class.down]="trend.positive">
                      {{ trend.positive ? '\u2191' : '\u2193' }} {{ trend.change | number:'1.2-2' }}%
                    </span>
                  }
                </div>
                <strong class="animated-value">{{ toDisplayValue(data.potentialSavings) | money }}</strong>
              </article>
            </div>
            <article class="metric-card metric-wide savings">
              <div class="metric-header">
                <span class="label">{{ yearlyView() ? 'Monthly Average' : 'Annual Cost' }}</span>
                @if (annualTrend(); as trend) {
                  <span class="badge savings-badge" [class.up]="!trend.positive" [class.down]="trend.positive">
                    {{ trend.positive ? '\u2191' : '\u2193' }} {{ trend.change | number:'1.2-2' }}%
                  </span>
                }
              </div>
              <strong class="animated-value">{{ (yearlyView() ? data.monthlyAverage : data.totalAnnualCost) | money }}</strong>
            </article>
          </div>
        </section>

        <section class="urgent">
          <app-urgent-action-cards
            [actions]="data.urgentActions"
            [mostUrgent]="data.mostUrgentAction"
            (cancelAssistant)="showCancelAssistant($event)"
            (snooze)="onSnooze($event)"
            (markRenewed)="onMarkRenewed($event)"
          />
        </section>

        <section class="charts">
          <app-donut-chart [data]="data.categoryBreakdown" />
          <app-monthly-trend-chart [data]="data.monthlyTrend" [categories]="data.categoryBreakdown" />
        </section>
      } @else if (loadError()) {
        <div class="error-state">
          <p>{{ loadError() }}</p>
          <button type="button" class="btn-retry" (click)="reload()">Retry</button>
        </div>
      } @else {
        <app-loading-spinner [centered]="true" label="Loading dashboard..." />
      }

      <app-cancel-assistant-modal
        [action]="cancelAction()"
        (close)="cancelAction.set(null)"
        (markPendingCancel)="onMarkPendingCancel($event)"
      />
      <app-add-contract-wizard #wizard (saved)="reload()" />
    </div>
  `,
  styles: [`
    .dashboard { display: grid; gap: 1.25rem; }
    .page-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    h1 { margin: 0; color: #0f172a; font-size: 1.625rem; font-weight: 700; letter-spacing: -0.02em; }
    .page-header p { margin: 0.35rem 0 0; color: #64748b; font-size: 0.875rem; }
    .actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
    select {
      padding: 0.5rem 0.875rem;
      border-radius: 10px;
      border: 1px solid #d1d5db;
      background: #fff;
      font-size: 0.875rem;
      color: #0f172a;
      font-weight: 500;
      cursor: pointer;
    }
    .period-toggle {
      display: flex;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      overflow: hidden;
    }
    .period-toggle button {
      padding: 0.45rem 0.875rem;
      border: none;
      background: transparent;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .period-toggle button.active {
      background: #4f61c8;
      color: #fff;
    }
    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1.125rem;
      background: #4f61c8;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.15s;
    }
    .btn-primary:hover { background: #3d4db0; }
    .top-row {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) minmax(200px, 240px);
      gap: 1rem;
      align-items: stretch;
    }
    .leakage-card {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
      display: flex;
      flex-direction: column;
    }
    .leakage-card h3 { margin: 0 0 1rem; font-size: 0.9375rem; font-weight: 600; color: #0f172a; }
    .leakage-meter {
      height: 6px;
      background: #e8edf3;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .leakage-fill {
      height: 100%;
      background: linear-gradient(90deg, #eab308, #f59e0b);
      border-radius: 999px;
      transition: width 0.6s ease;
    }
    .leakage-amount { font-size: 2.25rem; color: #ca8a04; font-weight: 700; line-height: 1.1; }
    .leakage-sub { font-size: 0.8125rem; color: #64748b; margin: 0.5rem 0 0; }
    .metrics-stack { display: grid; gap: 0.75rem; }
    .metrics-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .metric-card {
      background: #fff;
      border-radius: 14px;
      padding: 0.875rem 1rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    }
    .metric-card.metric-wide { padding: 1rem 1.125rem; }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .metric-card .label { color: #64748b; font-size: 0.75rem; font-weight: 500; }
    .metric-card strong { font-size: 1.375rem; color: #0f172a; font-weight: 700; }
    .metric-card.savings strong { color: #0f172a; }
    .badge {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      white-space: nowrap;
    }
    .badge.up { background: #fee2e2; color: #dc2626; }
    .badge.down { background: #d1fae5; color: #059669; }
    .badge.savings-badge.up { background: #fee2e2; color: #dc2626; }
    .badge.savings-badge.down { background: #d1fae5; color: #059669; }
    .animated-value { animation: fadeIn 0.4s ease; display: block; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .charts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .loading { color: #64748b; }
    .error-state {
      background: #fff;
      border-radius: 14px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    }
    .error-state p { color: #64748b; margin: 0 0 1rem; }
    .btn-retry {
      padding: 0.5rem 1rem;
      background: #4f61c8;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    @media (max-width: 1100px) {
      .top-row { grid-template-columns: 1fr 1fr; }
      .metrics-stack { grid-column: 1 / -1; }
    }
    @media (max-width: 768px) {
      .top-row { grid-template-columns: 1fr; }
      .metrics-row { grid-template-columns: 1fr; }
      .charts { grid-template-columns: 1fr; }
    }
  `],
})
export class DashboardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly wizard = viewChild.required<AddContractWizardComponent>('wizard');

  readonly dashboard = signal<Dashboard | null>(null);
  readonly loadError = signal('');
  readonly selectedYear = signal(new Date().getFullYear());
  readonly yearlyView = signal(false);
  readonly cancelAction = signal<UrgentAction | null>(null);
  readonly years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  readonly leakagePercent = computed(() => {
    const data = this.dashboard();
    if (!data || data.totalAnnualCost === 0) return 0;
    return Math.min(100, (data.financialLeakage / data.totalAnnualCost) * 100);
  });

  readonly monthlyAvgTrend = computed(() => this.computeMonthOverMonthTrend());
  readonly savingsTrend = computed(() => {
    const data = this.dashboard();
    if (!data || data.totalAnnualCost === 0) return null;
    const ratio = (data.potentialSavings / data.totalAnnualCost) * 100;
    return { change: Math.abs(ratio * 0.1), positive: ratio > 0 } as MetricTrend;
  });
  readonly annualTrend = computed(() => {
    const trend = this.computeMonthOverMonthTrend();
    if (!trend) return null;
    return { change: trend.change, positive: !trend.positive } as MetricTrend;
  });

  constructor() {
    this.reload();
  }

  private computeMonthOverMonthTrend(): MetricTrend | null {
    const data = this.dashboard();
    if (!data || data.monthlyTrend.length < 2) return null;
    const sorted = [...data.monthlyTrend].sort((a, b) => a.month - b.month);
    const current = sorted[sorted.length - 1].amount;
    const previous = sorted[sorted.length - 2].amount;
    if (previous === 0) return { change: 0, positive: true };
    const change = Math.abs(((current - previous) / previous) * 100);
    return { change, positive: current >= previous };
  }

  toDisplayValue(annualValue: number): number {
    return this.yearlyView() ? annualValue : annualValue / 12;
  }

  onYearChange(event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    this.selectedYear.set(year);
    this.reload();
  }

  openWizard(): void {
    this.wizard().show();
  }

  showCancelAssistant(action: UrgentAction): void {
    this.cancelAction.set(action);
  }

  onSnooze(id: number): void {
    this.subscriptionService.snooze(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
  }

  onMarkRenewed(id: number): void {
    this.subscriptionService.markRenewed(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
  }

  onMarkPendingCancel(id: number): void {
    this.subscriptionService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sub) => {
        this.subscriptionService.update(id, {
          name: sub.name,
          category: sub.category,
          provider: sub.provider,
          status: 'PENDING_CANCEL',
          commitmentType: sub.commitmentType,
          startDate: sub.startDate,
          notes: sub.notes,
          cancellationWorkflow: sub.cancellationWorkflow,
          negotiationWorkflow: sub.negotiationWorkflow,
          billingFrequency: sub.contractTerm.billingFrequency,
          amount: sub.contractTerm.amount,
          currency: sub.contractTerm.currency,
          trialEndDate: sub.contractTerm.trialEndDate,
          renewalDate: sub.contractTerm.renewalDate,
          cancellationDeadlineDays: sub.contractTerm.cancellationDeadlineDays,
          autoRenew: sub.contractTerm.autoRenew,
          contractEndDate: sub.contractTerm.contractEndDate,
          isRefundable: sub.contractTerm.isRefundable,
        }).pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.cancelAction.set(null);
            this.reload();
          });
      });
  }

  reload(): void {
    this.dashboard.set(null);
    this.loadError.set('');
    this.analyticsService.getDashboard(this.selectedYear())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.dashboard.set(data),
        error: (error) => this.loadError.set(
          userFacingHttpError(error, 'Failed to load dashboard data. Please try again.'),
        ),
      });
  }
}
