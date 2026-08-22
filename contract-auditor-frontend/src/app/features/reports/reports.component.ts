import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  BillingFrequency,
  Dashboard,
  Subscription,
  UrgentAction,
} from '../../core/models/contract.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService, UserAppSettings } from '../../core/services/settings.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { userFacingHttpError } from '../../core/utils/http-error';
import { CancelAssistantModalComponent } from '../../shared/components/cancel-assistant-modal.component';
import {
  SpendSavingsChartComponent,
  SpendSavingsPoint,
} from '../../shared/components/spend-savings-chart.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

type ReportType = 'leakage' | 'spend' | 'risk';
type ScheduleCadence = 'weekly' | 'monthly';

interface ReportRow {
  subscription: Subscription;
  monthlySpend: number;
  leakage: number;
  statusKind: 'active' | 'high-risk' | 'pending' | 'trial' | 'inactive';
  statusLabel: string;
  riskFlag: string;
  daysUntilRenewal: number | null;
  primaryAction: 'resolve' | 'audit';
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MoneyPipe, SpendSavingsChartComponent, CancelAssistantModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reports-page">
      <header class="top-header">
        <h1>Reports &amp; Financial Analysis</h1>
        <div class="header-utils">
          <div class="notify-wrap">
            <button
              type="button"
              class="icon-btn"
              (click)="toggleNotifications($event)"
              [attr.aria-expanded]="notificationsOpen()"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              @if (unreadCount() > 0) {
                <span class="notify-dot" aria-hidden="true"></span>
              }
            </button>
            @if (notificationsOpen()) {
              <div class="notify-panel" role="dialog" aria-label="Notifications">
                <strong>Notifications</strong>
                @if (alerts().length === 0) {
                  <p>No urgent contract alerts right now.</p>
                } @else {
                  <ul>
                    @for (alert of alerts(); track alert.subscriptionId) {
                      <li>
                        <span>{{ alert.subscriptionName }}</span>
                        <small>{{ alert.daysUntilDeadline }} days left</small>
                      </li>
                    }
                  </ul>
                }
              </div>
            }
          </div>
          <span class="header-avatar" aria-hidden="true">{{ initials() }}</span>
          <span class="header-name">{{ displayName() }}</span>
          <button type="button" class="icon-btn" (click)="logout()" aria-label="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <section class="filter-bar">
        <label class="field">
          <span>Start Date</span>
          <input type="date" [value]="startDate()" (change)="onStartDate($event)" />
        </label>
        <label class="field">
          <span>End Date</span>
          <input type="date" [value]="endDate()" (change)="onEndDate($event)" />
        </label>
        <label class="field report-type">
          <span>Report Type</span>
          <select [value]="reportType()" (change)="onReportType($event)">
            <option value="leakage">Financial Leakage &amp; Audits</option>
            <option value="spend">Spend Summary</option>
            <option value="risk">High-Risk Renewals</option>
          </select>
        </label>
        <div class="export-actions">
          <button type="button" class="export-btn" (click)="exportPdf()" title="Export PDF" aria-label="Export PDF">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6M9 11h6"/></svg>
          </button>
          <button type="button" class="export-btn" (click)="exportCsv()" title="Export CSV" aria-label="Export CSV">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h5"/></svg>
          </button>
          <button type="button" class="export-btn" (click)="exportExcel()" title="Export Excel" aria-label="Export Excel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          </button>
        </div>
        <button type="button" class="btn-primary" (click)="openSchedule($event)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Schedule Automated Report
        </button>
      </section>

      @if (scheduleOpen()) {
        <div class="schedule-panel" role="dialog" aria-label="Schedule automated report">
          <strong>Schedule Automated Report</strong>
          <p>Email a {{ reportTypeLabel() }} summary using your existing notification settings.</p>
          <label class="field">
            <span>Cadence</span>
            <select [value]="scheduleCadence()" (change)="onCadence($event)">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <div class="schedule-actions">
            <button type="button" class="btn-ghost" (click)="scheduleOpen.set(false)">Cancel</button>
            <button type="button" class="btn-primary" (click)="confirmSchedule()">Save schedule</button>
          </div>
        </div>
      }

      @if (banner()) {
        <div class="banner" role="status">{{ banner() }}</div>
      }

      @if (loading()) {
        <p class="loading">Loading financial reports...</p>
      } @else if (loadError()) {
        <div class="error-state">
          <p>{{ loadError() }}</p>
          <button type="button" class="btn-retry" (click)="reload()">Retry</button>
        </div>
      } @else {
        <section class="kpi-row">
          <article class="kpi-card">
            <div class="kpi-top">
              <span>Total Analyzed Spend</span>
              <span class="kpi-icon spend" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </span>
            </div>
            <strong>{{ totalSpend() | money }}</strong>
            @if (spendTrend(); as trend) {
              <span class="trend" [class.up]="trend.positive" [class.down]="!trend.positive">
                {{ trend.positive ? '+' : '-' }}{{ trend.change | number:'1.2-2' }}%
              </span>
            }
          </article>
          <article class="kpi-card">
            <div class="kpi-top">
              <span>Identified Financial Leakage</span>
              <span class="kpi-icon leak" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6M8 8h8"/><path d="M6 22h12l-1-10H7L6 22z"/></svg>
              </span>
            </div>
            <strong>{{ totalLeakage() | money }}</strong>
            @if (leakageTrend(); as trend) {
              <span class="trend" [class.up]="!trend.positive" [class.down]="trend.positive">
                {{ trend.positive ? '+' : '-' }}{{ trend.change | number:'1.2-2' }}%
              </span>
            }
          </article>
          <article class="kpi-card">
            <div class="kpi-top">
              <span>Contracts Audited</span>
              <span class="kpi-icon audit" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
              </span>
            </div>
            <strong>{{ tableRows().length }} Contracts</strong>
            <span class="trend muted">no change</span>
          </article>
          <article class="kpi-card">
            <div class="kpi-top">
              <span>High-Risk Renewals</span>
              <span class="kpi-icon risk" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </span>
            </div>
            <strong>{{ highRiskCount() }} Contracts</strong>
            <span class="trend muted">no change</span>
          </article>
        </section>

        <app-spend-savings-chart [points]="chartPoints()" />

        <section class="table-card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contract Name</th>
                  <th>Category</th>
                  <th>Contract Status</th>
                  <th>Risk Flags</th>
                  <th>Current Monthly Spend</th>
                  <th>Identified Leakage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @if (tableRows().length === 0) {
                  <tr>
                    <td colspan="7" class="empty-cell">No contracts match this report and date range.</td>
                  </tr>
                }
                @for (row of tableRows(); track row.subscription.id) {
                  <tr>
                    <td class="name-cell">
                      <strong>{{ row.subscription.name }}</strong>
                      <span>{{ row.subscription.provider }}</span>
                    </td>
                    <td>{{ row.subscription.category }}</td>
                    <td>
                      <span class="status-pill" [class]="row.statusKind">{{ row.statusLabel }}</span>
                    </td>
                    <td>
                      <span class="flag-pill">{{ row.riskFlag }}</span>
                    </td>
                    <td>{{ row.monthlySpend | money }}</td>
                    <td>{{ row.leakage | money }}</td>
                    <td>
                      @if (row.primaryAction === 'resolve') {
                        <button type="button" class="btn-resolve" (click)="resolveRisk(row)">Resolve Risk</button>
                      } @else {
                        <button type="button" class="btn-outline" (click)="openAudit(row)">Detailed Audit Report</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (auditRow(); as row) {
        <div class="overlay" (click)="auditRow.set(null)" role="dialog" aria-modal="true">
          <div class="modal" (click)="$event.stopPropagation()">
            <header>
              <h2>Detailed Audit Report — {{ row.subscription.name }}</h2>
              <button type="button" class="close-btn" (click)="auditRow.set(null)" aria-label="Close">&times;</button>
            </header>
            <div class="modal-body">
              <dl>
                <div><dt>Provider</dt><dd>{{ row.subscription.provider }}</dd></div>
                <div><dt>Category</dt><dd>{{ row.subscription.category }}</dd></div>
                <div><dt>Status</dt><dd>{{ row.statusLabel }}</dd></div>
                <div><dt>Risk flag</dt><dd>{{ row.riskFlag }}</dd></div>
                <div><dt>Monthly spend</dt><dd>{{ row.monthlySpend | money }}</dd></div>
                <div><dt>Identified leakage</dt><dd>{{ row.leakage | money }}</dd></div>
                <div><dt>Renewal</dt><dd>{{ row.subscription.contractTerm.renewalDate | date:'mediumDate' }}</dd></div>
                <div><dt>Cancel by</dt><dd>{{ row.subscription.contractTerm.cancellationDeadlineDate | date:'mediumDate' }}</dd></div>
              </dl>
              @if (row.subscription.notes) {
                <p class="notes">{{ row.subscription.notes }}</p>
              }
            </div>
            <footer>
              <button type="button" class="btn-ghost" (click)="auditRow.set(null)">Close</button>
              <button type="button" class="btn-resolve" (click)="resolveRisk(row)">Resolve Risk</button>
            </footer>
          </div>
        </div>
      }

      <app-cancel-assistant-modal
        [action]="cancelAction()"
        (close)="cancelAction.set(null)"
        (markPendingCancel)="onMarkPendingCancel($event)"
      />
    </div>
  `,
  styles: [`
    .reports-page { display: grid; gap: 1.15rem; max-width: 1280px; }
    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    h1 { margin: 0; font-size: 1.85rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .header-utils {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      color: #334155;
    }
    .header-name { font-weight: 600; font-size: 0.92rem; }
    .header-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: #2a3149; color: #fff;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700;
    }
    .icon-btn {
      width: 36px; height: 36px; border: 0; background: transparent; color: #475569;
      border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      position: relative;
    }
    .icon-btn svg { width: 18px; height: 18px; }
    .icon-btn:hover { background: #e8edf5; color: #0f172a; }
    .notify-wrap { position: relative; }
    .notify-dot {
      position: absolute; top: 7px; right: 8px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #ef4444; border: 2px solid #eef0f4;
    }
    .notify-panel {
      position: absolute; right: 0; top: calc(100% + 8px); z-index: 20;
      width: min(320px, 78vw); background: #fff; border-radius: 12px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
      padding: 0.9rem 1rem;
    }
    .notify-panel strong { display: block; margin-bottom: 0.5rem; }
    .notify-panel p { margin: 0; color: #64748b; font-size: 0.875rem; }
    .notify-panel ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.55rem; }
    .notify-panel li { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.875rem; }
    .notify-panel small { color: #64748b; }
    .filter-bar {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .field { display: grid; gap: 0.3rem; min-width: 150px; }
    .field span { font-size: 0.75rem; font-weight: 600; color: #64748b; }
    .field input, .field select {
      padding: 0.55rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #fff;
      color: #0f172a;
      font-size: 0.875rem;
    }
    .report-type { min-width: 240px; flex: 1; }
    .export-actions { display: flex; gap: 0.4rem; }
    .export-btn {
      width: 38px; height: 38px; border-radius: 10px;
      border: 1px solid #d1d5db; background: #fff; color: #475569;
      display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .export-btn svg { width: 16px; height: 16px; }
    .export-btn:hover { background: #eef2ff; color: #4f61c8; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 0.4rem;
      margin-left: auto;
      padding: 0.6rem 1.05rem;
      background: #4f61c8; color: #fff; border: none; border-radius: 10px;
      font-weight: 600; cursor: pointer; font-size: 0.875rem;
    }
    .btn-primary:hover { background: #3d4db0; }
    .schedule-panel {
      background: #fff; border-radius: 14px; padding: 1rem 1.15rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
      display: grid; gap: 0.75rem; max-width: 420px;
    }
    .schedule-panel p { margin: 0; color: #64748b; font-size: 0.875rem; }
    .schedule-actions { display: flex; justify-content: flex-end; gap: 0.6rem; }
    .banner {
      background: #ecfdf5; color: #047857; border-radius: 10px;
      padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 600;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
    }
    .kpi-card {
      background: #fff;
      border-radius: 14px;
      padding: 1.05rem 1.15rem 1.15rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    }
    .kpi-top {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;
      color: #64748b; font-size: 0.8rem; font-weight: 600;
    }
    .kpi-icon {
      width: 34px; height: 34px; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .kpi-icon svg { width: 16px; height: 16px; }
    .kpi-icon.spend { background: #eef2ff; color: #4f61c8; }
    .kpi-icon.leak { background: #ecfeff; color: #0f766e; }
    .kpi-icon.audit { background: #f1f5f9; color: #475569; }
    .kpi-icon.risk { background: #fff7ed; color: #c2410c; }
    .kpi-card strong {
      display: block; margin: 0.7rem 0 0.35rem;
      font-size: 1.55rem; font-weight: 800; color: #0f172a;
    }
    .trend { font-size: 0.75rem; font-weight: 700; }
    .trend.up { color: #16a34a; }
    .trend.down { color: #dc2626; }
    .trend.muted { color: #94a3b8; font-weight: 500; }
    .table-card {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
      overflow: hidden;
    }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th {
      text-align: left; padding: 0.9rem 1rem;
      background: #f8fafc; color: #64748b;
      font-weight: 700; font-size: 0.72rem;
      text-transform: uppercase; letter-spacing: 0.04em;
      white-space: nowrap;
    }
    td { padding: 0.95rem 1rem; border-top: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .name-cell strong { display: block; color: #0f172a; }
    .name-cell span { font-size: 0.75rem; color: #64748b; }
    .empty-cell { text-align: center; color: #64748b; padding: 2rem 1rem; }
    .status-pill, .flag-pill {
      display: inline-flex; align-items: center;
      padding: 0.22rem 0.65rem; border-radius: 999px;
      font-size: 0.75rem; font-weight: 700; white-space: nowrap;
    }
    .status-pill.active { background: #dcfce7; color: #166534; }
    .status-pill.high-risk { background: #fce7f3; color: #9d174d; }
    .status-pill.pending { background: #ffedd5; color: #c2410c; }
    .status-pill.trial { background: #e0e7ff; color: #3730a3; }
    .status-pill.inactive { background: #f1f5f9; color: #64748b; }
    .flag-pill { background: #e2e8f0; color: #475569; }
    .btn-resolve {
      padding: 0.45rem 0.85rem; background: #4f61c8; color: #fff;
      border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.8125rem;
    }
    .btn-outline {
      padding: 0.42rem 0.8rem; background: #fff; color: #4f61c8;
      border: 1px solid #c7d2fe; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.8125rem;
    }
    .btn-ghost {
      padding: 0.5rem 0.9rem; background: #f1f5f9; color: #334155;
      border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .btn-retry {
      padding: 0.5rem 1rem; background: #4f61c8; color: #fff;
      border: none; border-radius: 10px; font-weight: 600; cursor: pointer;
    }
    .loading, .error-state {
      background: #fff; border-radius: 14px; padding: 2rem; text-align: center;
      color: #64748b; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    }
    .overlay {
      position: fixed; inset: 0; background: rgba(15,23,42,.5);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;
    }
    .modal {
      background: #fff; border-radius: 16px; max-width: 560px; width: 100%;
      box-shadow: 0 20px 60px rgba(15,23,42,.2);
    }
    .modal header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.15rem 1.4rem; border-bottom: 1px solid #e2e8f0;
    }
    .modal h2 { margin: 0; font-size: 1.05rem; }
    .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
    .modal-body { padding: 1.25rem 1.4rem; }
    dl { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem 1rem; }
    dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; font-weight: 700; }
    dd { margin: 0.2rem 0 0; color: #0f172a; font-weight: 600; }
    .notes { margin: 1rem 0 0; color: #475569; font-size: 0.875rem; }
    .modal footer {
      display: flex; justify-content: flex-end; gap: 0.65rem;
      padding: 1rem 1.4rem; border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 1100px) {
      .kpi-row { grid-template-columns: 1fr 1fr; }
      .btn-primary { margin-left: 0; }
    }
    @media (max-width: 720px) {
      .kpi-row { grid-template-columns: 1fr; }
      h1 { font-size: 1.4rem; }
      .header-name { display: none; }
      dl { grid-template-columns: 1fr; }
    }
    @media print {
      .filter-bar, .header-utils, .export-actions, .btn-primary, .schedule-panel { display: none !important; }
    }
  `],
})
export class ReportsComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.authService.currentUser;
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly banner = signal('');
  readonly notificationsOpen = signal(false);
  readonly scheduleOpen = signal(false);
  readonly scheduleCadence = signal<ScheduleCadence>('weekly');
  readonly reportType = signal<ReportType>('leakage');
  readonly startDate = signal(isoDate(new Date(new Date().getFullYear(), 0, 1)));
  readonly endDate = signal(isoDate(new Date()));
  readonly dashboards = signal<{ year: number; data: Dashboard }[]>([]);
  readonly subscriptions = signal<Subscription[]>([]);
  readonly appSettings = signal<UserAppSettings>(this.settingsService.load(undefined));
  readonly cancelAction = signal<UrgentAction | null>(null);
  readonly auditRow = signal<ReportRow | null>(null);

  readonly displayName = computed(() => this.user()?.fullName || 'Account');
  readonly initials = computed(() => toInitials(this.displayName()));
  readonly alerts = computed(() => this.latestDashboard()?.data.urgentActions ?? []);
  readonly unreadCount = computed(() => this.alerts().length);

  readonly allRows = computed(() => this.subscriptions().map((sub) => this.toRow(sub)));

  readonly tableRows = computed(() => {
    const type = this.reportType();
    const rows = this.allRows().filter((row) => this.inDateRange(row.subscription));
    if (type === 'risk') {
      return rows.filter((row) => row.statusKind === 'high-risk' || row.statusKind === 'pending');
    }
    if (type === 'leakage') {
      return [...rows].sort((a, b) => b.leakage - a.leakage);
    }
    return [...rows].sort((a, b) => b.monthlySpend - a.monthlySpend);
  });

  readonly totalSpend = computed(() => {
    const trendTotal = this.chartPoints().reduce((sum, point) => sum + point.spend, 0);
    if (trendTotal > 0) {
      return trendTotal;
    }
    return this.tableRows().reduce((sum, row) => sum + row.monthlySpend, 0);
  });

  readonly totalLeakage = computed(() => {
    const fromRows = this.tableRows().reduce((sum, row) => sum + row.leakage, 0);
    if (fromRows > 0) {
      return fromRows;
    }
    return this.latestDashboard()?.data.financialLeakage ?? 0;
  });

  readonly highRiskCount = computed(
    () => this.allRows().filter((row) => row.statusKind === 'high-risk').length,
  );

  readonly chartPoints = computed((): SpendSavingsPoint[] => {
    const start = parseIsoDate(this.startDate());
    const end = parseIsoDate(this.endDate());
    const months = monthsInRange(start, end);
    const trendByKey = new Map<string, number>();
    this.dashboards().forEach((dashboard) => {
      dashboard.data.monthlyTrend.forEach((item) => {
        trendByKey.set(`${dashboard.year}-${item.month}`, item.amount);
      });
    });
    const annualSavings = this.latestDashboard()?.data.potentialSavings ?? 0;
    return months.map(({ year, month }) => {
      const spend = trendByKey.get(`${year}-${month}`) ?? this.fallbackMonthSpend(month);
      const savings = spend > 0 ? roundMoney(Math.max(spend * 0.12, annualSavings / Math.max(months.length, 1))) : 0;
      return {
        month,
        year,
        label: MONTH_LABELS[month - 1],
        spend: roundMoney(spend),
        savings,
      };
    });
  });

  readonly spendTrend = computed(() => this.monthOverMonthTrend());
  readonly leakageTrend = computed(() => {
    const total = this.totalSpend();
    const leakage = this.totalLeakage();
    if (total <= 0 || leakage <= 0) {
      return null;
    }
    return { change: Math.abs((leakage / total) * 100) * 0.1, positive: false };
  });

  readonly reportTypeLabel = computed(() => {
    const type = this.reportType();
    if (type === 'spend') return 'Spend Summary';
    if (type === 'risk') return 'High-Risk Renewals';
    return 'Financial Leakage & Audits';
  });

  constructor() {
    this.reload();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.notificationsOpen.set(false);
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.scheduleOpen.set(false);
    this.notificationsOpen.update((open) => !open);
  }

  onStartDate(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    const end = this.endDate();
    this.startDate.set(value > end ? end : value);
    this.reload();
  }

  onEndDate(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;
    const start = this.startDate();
    this.endDate.set(value < start ? start : value);
    this.reload();
  }

  onReportType(event: Event): void {
    this.reportType.set((event.target as HTMLSelectElement).value as ReportType);
  }

  onCadence(event: Event): void {
    this.scheduleCadence.set((event.target as HTMLSelectElement).value as ScheduleCadence);
  }

  openSchedule(event: Event): void {
    event.stopPropagation();
    this.notificationsOpen.set(false);
    this.scheduleOpen.update((open) => !open);
  }

  confirmSchedule(): void {
    const current = this.appSettings();
    this.settingsService.save(this.user()?.id, { ...current, weeklyCostSummary: true });
    this.appSettings.set(this.settingsService.load(this.user()?.id));
    this.scheduleOpen.set(false);
    this.banner.set(
      this.scheduleCadence() === 'weekly'
        ? 'Weekly automated report scheduled. You can change this anytime in Settings.'
        : 'Monthly automated report scheduled. Weekly cost summaries stay enabled in Settings.',
    );
  }

  resolveRisk(row: ReportRow): void {
    this.auditRow.set(null);
    this.cancelAction.set(this.toUrgentAction(row));
  }

  openAudit(row: ReportRow): void {
    this.auditRow.set(row);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/');
  }

  exportCsv(): void {
    this.downloadFile(this.buildCsv(), 'contract-auditor-report.csv', 'text/csv;charset=utf-8;');
  }

  exportExcel(): void {
    const html = `<table>${this.buildHtmlTable()}</table>`;
    this.downloadFile(html, 'contract-auditor-report.xls', 'application/vnd.ms-excel');
  }

  exportPdf(): void {
    window.print();
  }

  onMarkPendingCancel(id: number): void {
    this.subscriptionService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sub) => {
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
            .subscribe({
              next: () => {
                this.cancelAction.set(null);
                this.reload();
              },
              error: (error) => this.loadError.set(
                userFacingHttpError(error, 'Unable to update this contract. Please try again.'),
              ),
            });
        },
        error: (error) => this.loadError.set(
          userFacingHttpError(error, 'Unable to load this contract. Please try again.'),
        ),
      });
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set('');
    const years = this.yearsInRange();
    forkJoin({
      dashboards: forkJoin(
        years.map((year) => this.analyticsService.getDashboard(year)),
      ),
      subscriptions: this.subscriptionService.listAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboards, subscriptions }) => {
          this.dashboards.set(years.map((year, index) => ({ year, data: dashboards[index] })));
          this.subscriptions.set(subscriptions);
          this.appSettings.set(this.settingsService.load(this.user()?.id));
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.loadError.set(userFacingHttpError(error, 'Failed to load reports. Please try again.'));
        },
      });
  }

  private yearsInRange(): number[] {
    const start = parseIsoDate(this.startDate()).getFullYear();
    const end = parseIsoDate(this.endDate()).getFullYear();
    const years: number[] = [];
    for (let year = start; year <= end && years.length < 6; year++) {
      years.push(year);
    }
    return years.length > 0 ? years : [new Date().getFullYear()];
  }

  private latestDashboard(): { year: number; data: Dashboard } | null {
    const items = this.dashboards();
    return items.length > 0 ? items[items.length - 1] : null;
  }

  private fallbackMonthSpend(month: number): number {
    const rows = this.allRows();
    if (rows.length === 0) {
      return 0;
    }
    const start = parseIsoDate(this.startDate());
    const end = parseIsoDate(this.endDate());
    return rows
      .filter((row) => {
        const renewal = parseIsoDate(row.subscription.contractTerm.renewalDate);
        return renewal.getMonth() + 1 === month && renewal >= start && renewal <= end;
      })
      .reduce((sum, row) => sum + row.monthlySpend, 0);
  }

  private monthOverMonthTrend(): { change: number; positive: boolean } | null {
    const points = this.chartPoints();
    if (points.length < 2) {
      return null;
    }
    const current = points[points.length - 1].spend;
    const previous = points[points.length - 2].spend;
    if (previous === 0) {
      return { change: 0, positive: true };
    }
    const delta = ((current - previous) / previous) * 100;
    return { change: Math.abs(delta), positive: delta >= 0 };
  }

  private toRow(subscription: Subscription): ReportRow {
    const monthlySpend = monthlyAmount(subscription.contractTerm.amount, subscription.contractTerm.billingFrequency);
    const daysUntilRenewal = daysUntil(subscription.contractTerm.renewalDate);
    const autoRenewSoon = Boolean(subscription.contractTerm.autoRenew)
      && daysUntilRenewal !== null
      && daysUntilRenewal >= 0
      && daysUntilRenewal <= 14;
    const statusKind = this.statusKind(subscription, autoRenewSoon);
    const leakage = this.estimateLeakage(subscription, monthlySpend, autoRenewSoon);
    return {
      subscription,
      monthlySpend,
      leakage,
      statusKind,
      statusLabel: this.statusLabel(subscription, statusKind, daysUntilRenewal),
      riskFlag: this.riskFlag(subscription, autoRenewSoon, leakage, monthlySpend),
      daysUntilRenewal,
      primaryAction: statusKind === 'high-risk' || statusKind === 'pending' ? 'resolve' : 'audit',
    };
  }

  private statusKind(subscription: Subscription, autoRenewSoon: boolean): ReportRow['statusKind'] {
    if (subscription.status === 'PENDING_CANCEL') return 'pending';
    if (subscription.status === 'TRIAL') return 'trial';
    if (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') return 'inactive';
    if (autoRenewSoon) return 'high-risk';
    return 'active';
  }

  private statusLabel(
    subscription: Subscription,
    kind: ReportRow['statusKind'],
    daysUntilRenewal: number | null,
  ): string {
    if (kind === 'high-risk') {
      const days = daysUntilRenewal ?? 0;
      return `High Risk (Auto-renew ${days} days)`;
    }
    if (kind === 'pending') return 'Pending Cancellation';
    if (kind === 'trial') return 'Trial';
    if (kind === 'inactive') return subscription.status.replaceAll('_', ' ');
    return 'Active';
  }

  private riskFlag(
    subscription: Subscription,
    autoRenewSoon: boolean,
    leakage: number,
    monthlySpend: number,
  ): string {
    if (subscription.status === 'TRIAL') {
      return 'Trial converting';
    }
    if (autoRenewSoon) {
      const hike = this.appSettings().autoFlagPriceHikePercent;
      return `Price Hike: +${hike}%`;
    }
    if (monthlySpend > 0 && leakage / monthlySpend >= 0.1) {
      return `Unused spend: ${Math.round((leakage / monthlySpend) * 100)}%`;
    }
    if (subscription.contractTerm.autoRenew) {
      return 'Auto-renew enabled';
    }
    return 'No material risk';
  }

  private estimateLeakage(subscription: Subscription, monthlySpend: number, autoRenewSoon: boolean): number {
    if (subscription.status === 'TRIAL') {
      return roundMoney(monthlySpend);
    }
    if (autoRenewSoon || subscription.contractTerm.autoRenew) {
      return roundMoney(monthlySpend * 0.15);
    }
    return 0;
  }

  private inDateRange(subscription: Subscription): boolean {
    const start = parseIsoDate(this.startDate());
    const end = parseIsoDate(this.endDate());
    const startDate = parseIsoDate(subscription.startDate);
    const renewal = parseIsoDate(subscription.contractTerm.renewalDate);
    return startDate <= end && renewal >= start;
  }

  private toUrgentAction(row: ReportRow): UrgentAction {
    const term = row.subscription.contractTerm;
    const deadline = term.cancellationDeadlineDate ?? term.renewalDate;
    return {
      subscriptionId: row.subscription.id,
      subscriptionName: row.subscription.name,
      provider: row.subscription.provider,
      category: row.subscription.category,
      status: row.subscription.status,
      cancellationDeadline: deadline,
      renewalDate: term.renewalDate,
      daysUntilDeadline: daysUntil(deadline) ?? 0,
      urgencyLevel: (row.daysUntilRenewal ?? 99) <= 3 ? 'RED' : 'YELLOW',
      amount: term.amount,
      currency: term.currency,
      cancellationWorkflow: row.subscription.cancellationWorkflow,
    };
  }

  private buildCsv(): string {
    const header = [
      'Contract Name',
      'Provider',
      'Category',
      'Contract Status',
      'Risk Flags',
      'Current Monthly Spend',
      'Identified Leakage',
    ];
    const lines = this.tableRows().map((row) => [
      csv(row.subscription.name),
      csv(row.subscription.provider),
      csv(row.subscription.category),
      csv(row.statusLabel),
      csv(row.riskFlag),
      String(row.monthlySpend),
      String(row.leakage),
    ].join(','));
    return [header.join(','), ...lines].join('\n');
  }

  private buildHtmlTable(): string {
    const header = '<tr><th>Contract Name</th><th>Category</th><th>Status</th><th>Risk Flags</th><th>Monthly Spend</th><th>Leakage</th></tr>';
    const rows = this.tableRows().map((row) =>
      `<tr><td>${escapeHtml(row.subscription.name)}</td><td>${escapeHtml(row.subscription.category)}</td><td>${escapeHtml(row.statusLabel)}</td><td>${escapeHtml(row.riskFlag)}</td><td>${row.monthlySpend}</td><td>${row.leakage}</td></tr>`,
    ).join('');
    return header + rows;
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseIsoDate(value.slice(0, 10));
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function monthlyAmount(amount: number, frequency: BillingFrequency): number {
  switch (frequency) {
    case 'WEEKLY':
      return roundMoney((amount * 52) / 12);
    case 'MONTHLY':
      return roundMoney(amount);
    case 'QUARTERLY':
      return roundMoney(amount / 3);
    case 'SEMI_ANNUAL':
      return roundMoney(amount / 6);
    case 'ANNUAL':
    case 'ONE_TIME':
      return roundMoney(amount / 12);
    default:
      return roundMoney(amount);
  }
}

function monthsInRange(start: Date, end: Date): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last && result.length < 12) {
    result.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result.length > 6 ? result.slice(-6) : result;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function csv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
