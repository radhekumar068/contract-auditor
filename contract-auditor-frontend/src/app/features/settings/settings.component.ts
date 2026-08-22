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
import { UrgentAction } from '../../core/models/contract.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import {
  CardBrand,
  PaymentMethodReminder,
  SettingsService,
  SettingsTab,
  UserAppSettings,
} from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
      <header class="top-header">
        <h1>Settings</h1>
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
                @if (!settings().inAppAlerts) {
                  <p>In-app alerts are turned off.</p>
                } @else if (alerts().length === 0) {
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

      <nav class="tabs" role="tablist" aria-label="Settings sections">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            class="tab"
            [class.active]="activeTab() === tab.id"
            [attr.aria-selected]="activeTab() === tab.id"
            (click)="activeTab.set(tab.id)"
          >
            <span class="tab-icon" aria-hidden="true">
              @switch (tab.id) {
                @case ('general') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                }
                @case ('notifications') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                }
                @case ('audit') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                }
                @case ('payments') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                }
              }
            </span>
            {{ tab.label }}
          </button>
        }
      </nav>

      <div class="section-bar">
        <p>Application preferences, notification settings, and audit controls</p>
        <button type="button" class="btn-save" [disabled]="!dirty() || saving()" (click)="saveChanges()">
          {{ saving() ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>

      @if (errorMessage()) {
        <div class="banner error" role="alert">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="banner success" role="status">{{ successMessage() }}</div>
      }

      @if (activeTab() === 'notifications') {
        <section class="cards" aria-label="Notification Center">
          <article class="card">
            <h2>Email Alerts</h2>
            <div class="toggle-row">
              <button type="button" class="toggle" [class.on]="settings().contractExpiringSoon" (click)="toggle('contractExpiringSoon')" [attr.aria-checked]="settings().contractExpiringSoon" role="switch" aria-label="Contract Expiring Soon"></button>
              <div class="toggle-copy">
                <span>Contract Expiring Soon</span>
                <select
                  [value]="settings().expiringSoonDays"
                  [disabled]="!settings().contractExpiringSoon"
                  (change)="onNumberSelect('expiringSoonDays', $event)"
                  aria-label="Days before contract expiry"
                >
                  @for (days of expiringDayOptions; track days) {
                    <option [value]="days">{{ days }} days</option>
                  }
                </select>
              </div>
            </div>
            <div class="toggle-row">
              <button type="button" class="toggle" [class.on]="settings().autoRenewalApproaching" (click)="toggle('autoRenewalApproaching')" [attr.aria-checked]="settings().autoRenewalApproaching" role="switch" aria-label="Auto-Renewal Approaching"></button>
              <span>Auto-Renewal Approaching</span>
            </div>
            <div class="toggle-row">
              <button type="button" class="toggle" [class.on]="settings().urgentCancellationWindow" (click)="toggle('urgentCancellationWindow')" [attr.aria-checked]="settings().urgentCancellationWindow" role="switch" aria-label="Urgent Cancellation Window"></button>
              <span>Urgent Cancellation Window</span>
            </div>
            <div class="toggle-row">
              <button type="button" class="toggle" [class.on]="settings().weeklyCostSummary" (click)="toggle('weeklyCostSummary')" [attr.aria-checked]="settings().weeklyCostSummary" role="switch" aria-label="Weekly Cost Summary Report"></button>
              <span>Weekly Cost Summary Report</span>
            </div>
          </article>

          <article class="card">
            <h2>Notification Channels</h2>
            <div class="toggle-row">
              <button type="button" class="toggle" [class.on]="settings().inAppAlerts" (click)="toggle('inAppAlerts')" [attr.aria-checked]="settings().inAppAlerts" role="switch" aria-label="In-App Alerts"></button>
              <span>In-App Alerts</span>
            </div>
            <div class="toggle-row">
              <button type="button" class="toggle" [class.on]="settings().externalIntegration" (click)="toggle('externalIntegration')" [attr.aria-checked]="settings().externalIntegration" role="switch" aria-label="External Integration"></button>
              <span>External Integration</span>
            </div>
            <div class="channel-row" [class.disabled]="!settings().externalIntegration">
              <span class="slack-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path fill="#E01E5A" d="M6 15a2 2 0 1 1-2-2h2v2Z"/>
                  <path fill="#E01E5A" d="M7 15a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0v-5Z"/>
                  <path fill="#36C5F0" d="M9 6a2 2 0 1 1 2-2v2H9Z"/>
                  <path fill="#36C5F0" d="M9 7a2 2 0 1 1 0 4H4a2 2 0 1 1 0-4h5Z"/>
                  <path fill="#2EB67D" d="M18 9a2 2 0 1 1 2 2h-2V9Z"/>
                  <path fill="#2EB67D" d="M17 9a2 2 0 1 1-4 0V4a2 2 0 1 1 4 0v5Z"/>
                  <path fill="#ECB22E" d="M15 18a2 2 0 1 1-2 2v-2h2Z"/>
                  <path fill="#ECB22E" d="M15 17a2 2 0 1 1 0-4h5a2 2 0 1 1 0 4h-5Z"/>
                </svg>
              </span>
              <div class="channel-select">
                <select
                  [value]="settings().slackChannel"
                  [disabled]="!settings().externalIntegration"
                  (change)="onTextSelect('slackChannel', $event)"
                  aria-label="External integration channel"
                >
                  @for (channel of slackChannels; track channel.value) {
                    <option [value]="channel.value">{{ channel.label }}</option>
                  }
                </select>
                <small>channel</small>
              </div>
            </div>
          </article>

          <article class="card">
            <h2>In-App Notification Thresholds</h2>
            <p class="threshold">
              Show urgent alerts for contracts expiring in
              <input
                type="number"
                min="1"
                max="365"
                [value]="settings().urgentAlertDays"
                (input)="onNumberInput('urgentAlertDays', $event)"
                aria-label="Urgent alert days"
              />
              days
            </p>
            <p class="threshold">
              Threshold for 'High Financial Leakage' alert:
              <span class="money-input">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  [value]="settings().highLeakageThreshold ?? ''"
                  (input)="onOptionalNumberInput('highLeakageThreshold', $event)"
                  aria-label="High financial leakage threshold"
                />
              </span>
            </p>
          </article>
        </section>
      }

      @if (activeTab() === 'general') {
        <section class="cards two" aria-label="General Preferences">
          <article class="card">
            <h2>Display</h2>
            <label class="field">
              Date format
              <select [value]="settings().dateFormat" (change)="onTextSelect('dateFormat', $event)">
                <option value="MDY">Month / Day / Year</option>
                <option value="DMY">Day / Month / Year</option>
                <option value="YMD">Year / Month / Day</option>
              </select>
            </label>
            <label class="field">
              Week starts on
              <select [value]="settings().weekStartsOn" (change)="onTextSelect('weekStartsOn', $event)">
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </label>
            <div class="toggle-row">
              <button type="button" class="toggle" [class.on]="settings().compactCards" (click)="toggle('compactCards')" [attr.aria-checked]="settings().compactCards" role="switch" aria-label="Compact dashboard cards"></button>
              <span>Compact dashboard cards</span>
            </div>
          </article>
          <article class="card">
            <h2>Reminders</h2>
            <label class="field">
              Default reminder lead time
              <select [value]="settings().defaultReminderDays" (change)="onNumberSelect('defaultReminderDays', $event)">
                @for (days of reminderDayOptions; track days) {
                  <option [value]="days">{{ days }} days</option>
                }
              </select>
            </label>
            <p class="hint">Used when a new contract is added without a custom notification schedule.</p>
          </article>
        </section>
      }

      @if (activeTab() === 'audit') {
        <section class="cards two" aria-label="Audit Controls">
          <article class="card">
            <h2>Automatic Flagging</h2>
            <label class="field">
              Flag unused subscriptions after
              <div class="inline-input">
                <input type="number" min="1" max="365" [value]="settings().autoFlagUnusedDays" (input)="onNumberInput('autoFlagUnusedDays', $event)" aria-label="Unused days threshold" />
                <span>days</span>
              </div>
            </label>
            <label class="field">
              Flag price hikes above
              <div class="inline-input">
                <input type="number" min="1" max="100" [value]="settings().autoFlagPriceHikePercent" (input)="onNumberInput('autoFlagPriceHikePercent', $event)" aria-label="Price hike percent" />
                <span>%</span>
              </div>
            </label>
            <label class="field">
              Risk score threshold
              <div class="inline-input">
                <input type="number" min="1" max="100" [value]="settings().autoFlagRiskScore" (input)="onNumberInput('autoFlagRiskScore', $event)" aria-label="Risk score threshold" />
                <span>/ 100</span>
              </div>
            </label>
          </article>
          <article class="card">
            <h2>Review Safety</h2>
            <div class="toggle-row">
              <button type="button" class="toggle" [class.on]="settings().requireSnoozeConfirm" (click)="toggle('requireSnoozeConfirm')" [attr.aria-checked]="settings().requireSnoozeConfirm" role="switch" aria-label="Confirm before snoozing urgent items"></button>
              <span>Confirm before snoozing urgent items</span>
            </div>
            <p class="hint">Audit Controls allow setting risk thresholds for automatic flagging of unused spend, steep renewals, and high-risk contracts.</p>
          </article>
        </section>
      }

      @if (activeTab() === 'payments') {
        <section class="cards two" aria-label="Payment Methods">
          <article class="card">
            <h2>Saved reminders</h2>
            <p class="hint">Store last-four reminders for cards used on vendor sites. Full card numbers are never collected.</p>
            @if (settings().paymentMethods.length === 0) {
              <p class="empty">No payment reminders saved yet.</p>
            } @else {
              <ul class="methods">
                @for (method of settings().paymentMethods; track method.id) {
                  <li>
                    <div>
                      <strong>{{ brandLabel(method.brand) }} · {{ method.last4 }}</strong>
                      <small>{{ method.nickname || 'No nickname' }} · {{ method.expiryMonth }}/{{ method.expiryYear }}</small>
                    </div>
                    <button type="button" class="link-btn" (click)="removePayment(method.id)">Remove</button>
                  </li>
                }
              </ul>
            }
          </article>
          <article class="card">
            <h2>Add reminder</h2>
            <label class="field">
              Brand
              <select [value]="newPayment().brand" (change)="onNewPaymentSelect('brand', $event)">
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label class="field">
              Nickname
              <input type="text" maxlength="80" [value]="newPayment().nickname" (input)="onNewPaymentText('nickname', $event)" placeholder="Personal card" />
            </label>
            <div class="split">
              <label class="field">
                Last 4
                <input type="text" inputmode="numeric" maxlength="4" [value]="newPayment().last4" (input)="onNewPaymentText('last4', $event)" placeholder="4242" />
              </label>
              <label class="field">
                Exp. month
                <input type="text" inputmode="numeric" maxlength="2" [value]="newPayment().expiryMonth" (input)="onNewPaymentText('expiryMonth', $event)" placeholder="08" />
              </label>
              <label class="field">
                Exp. year
                <input type="text" inputmode="numeric" maxlength="2" [value]="newPayment().expiryYear" (input)="onNewPaymentText('expiryYear', $event)" placeholder="28" />
              </label>
            </div>
            <button type="button" class="btn-secondary" (click)="addPayment()">Add payment reminder</button>
          </article>
        </section>
      }

      <section class="details">
        <h2>Additional Implementation Details</h2>
        <div class="details-box">
          <p>Notification channels like Slack and custom category mapping for cost categories are configured here. Audit Controls allow setting risk thresholds for automatic flagging.</p>
          <span class="sparkle" aria-hidden="true">✦</span>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 1180px; }
    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.15rem;
    }
    h1 { margin: 0; font-size: 2rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    h2 { margin: 0 0 1rem; font-size: 1.05rem; font-weight: 700; color: #0f172a; }
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
    .tabs {
      display: flex; gap: 0.35rem; background: #e4e9f2; border-radius: 14px; padding: 0.3rem;
      overflow-x: auto;
    }
    .tab {
      flex: 1 0 auto;
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      border: 0; background: transparent; color: #64748b;
      padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; font-size: 0.9rem;
      cursor: pointer; white-space: nowrap; position: relative;
    }
    .tab.active {
      background: #fff; color: #0f172a;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    .tab.active::after {
      content: '';
      position: absolute; left: 12px; right: 12px; bottom: 4px;
      height: 3px; border-radius: 999px; background: #5c67f2;
    }
    .tab-icon { display: inline-flex; width: 16px; height: 16px; }
    .tab-icon svg { width: 16px; height: 16px; }
    .section-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      margin: 1.1rem 0 1rem;
    }
    .section-bar p { margin: 0; color: #64748b; font-size: 0.95rem; }
    .btn-save, .btn-secondary {
      border: 0; border-radius: 10px; font-weight: 700; cursor: pointer;
    }
    .btn-save {
      background: #5c67f2; color: #fff; padding: 0.7rem 1.15rem; white-space: nowrap;
    }
    .btn-save:hover { background: #4b55de; }
    .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-secondary {
      background: #eef0ff; color: #3941b8; padding: 0.7rem 1rem; width: 100%; margin-top: 0.35rem;
    }
    .banner { padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.9rem; }
    .banner.error { background: #fef2f2; color: #b91c1c; }
    .banner.success { background: #ecfdf5; color: #047857; }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      align-items: start;
    }
    .cards.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .card {
      background: #fff; border-radius: 14px; padding: 1.25rem 1.35rem;
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
      min-height: 220px;
    }
    .toggle-row {
      display: flex; align-items: flex-start; gap: 0.75rem;
      padding: 0.55rem 0;
    }
    .toggle-copy { display: grid; gap: 0.45rem; min-width: 0; flex: 1; }
    .toggle {
      width: 42px; height: 24px; border: 0; border-radius: 999px;
      background: #cbd5e1; position: relative; cursor: pointer; flex-shrink: 0; margin-top: 1px;
    }
    .toggle::after {
      content: ''; position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 50%; background: #fff;
      transition: transform 0.16s ease;
    }
    .toggle.on { background: #5c67f2; }
    .toggle.on::after { transform: translateX(18px); }
    select, input[type="number"], input[type="text"] {
      border: 1px solid #dbe3ee; background: #f4f7fb; border-radius: 8px;
      padding: 0.5rem 0.75rem; font: inherit; color: #0f172a;
      box-sizing: border-box;
    }
    .field select, .field input[type="text"], .field input[type="number"] {
      width: 100%;
      min-width: 0;
    }
    .channel-row {
      display: flex; align-items: center; gap: 0.7rem;
      margin: 0.35rem 0 0 2.7rem;
    }
    .channel-row.disabled { opacity: 0.5; pointer-events: none; }
    .slack-mark {
      width: 28px; height: 28px; display: inline-flex; flex-shrink: 0;
    }
    .slack-mark svg { width: 28px; height: 28px; }
    .channel-select { display: grid; gap: 0.15rem; min-width: 0; flex: 1; }
    .channel-select small { color: #94a3b8; font-size: 0.75rem; }
    .threshold {
      margin: 0 0 1rem; color: #334155; line-height: 1.7; font-size: 0.95rem;
    }
    .threshold input {
      width: 4.25rem; text-align: center; margin: 0 0.25rem;
    }
    .money-input {
      display: inline-flex; align-items: center; gap: 0.3rem; margin-left: 0.25rem;
    }
    .money-input input { width: 6.5rem; }
    .field { display: grid; gap: 0.4rem; font-size: 0.85rem; color: #475569; margin-bottom: 0.9rem; }
    .hint { margin: 0.4rem 0 0; color: #64748b; font-size: 0.85rem; line-height: 1.5; }
    .inline-input { display: flex; align-items: center; gap: 0.45rem; }
    .inline-input input { width: 5.5rem; }
    .empty { color: #64748b; margin: 0.5rem 0 0; }
    .methods { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.7rem; }
    .methods li {
      display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
      padding: 0.7rem 0; border-bottom: 1px solid #eef2f7;
    }
    .methods li:last-child { border-bottom: 0; }
    .methods small { display: block; color: #64748b; margin-top: 0.15rem; }
    .link-btn { border: 0; background: none; color: #b91c1c; cursor: pointer; font-weight: 600; }
    .split {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.6rem;
    }
    .split .field { min-width: 0; }
    .split input {
      width: 100%;
      min-width: 0;
      padding: 0.5rem 0.75rem;
    }
    .details { margin-top: 1.5rem; }
    .details h2 { margin-bottom: 0.7rem; }
    .details-box {
      position: relative;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 1.1rem 1.25rem; min-height: 76px;
    }
    .details-box p { margin: 0; color: #475569; line-height: 1.55; max-width: 72ch; }
    .sparkle {
      position: absolute; right: 14px; bottom: 10px; color: #cbd5e1; font-size: 1rem;
    }
    @media (max-width: 980px) {
      .cards, .cards.two { grid-template-columns: 1fr; }
      .header-name { display: none; }
    }
    @media (max-width: 720px) {
      .top-header { align-items: flex-start; }
      .section-bar { flex-direction: column; align-items: stretch; }
      .split { grid-template-columns: 1fr; }
      .channel-row { margin-left: 0; }
    }
  `],
})
export class SettingsComponent {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.authService.currentUser;
  readonly settings = signal<UserAppSettings>(this.settingsService.load(this.user()?.id));
  readonly activeTab = signal<SettingsTab>('notifications');
  readonly dirty = signal(false);
  readonly saving = signal(false);
  readonly notificationsOpen = signal(false);
  readonly alerts = signal<UrgentAction[]>([]);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly newPayment = signal<Omit<PaymentMethodReminder, 'id'>>({
    brand: 'visa',
    last4: '',
    expiryMonth: '',
    expiryYear: '',
    nickname: '',
  });

  readonly tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General Preferences' },
    { id: 'notifications', label: 'Notification Center' },
    { id: 'audit', label: 'Audit Controls' },
    { id: 'payments', label: 'Payment Methods' },
  ];
  readonly expiringDayOptions = [7, 14, 30, 60, 90];
  readonly reminderDayOptions = [7, 14, 21, 30, 45, 60];
  readonly slackChannels = [
    { value: 'slack-audit-alerts', label: 'Slack #audit-alerts' },
    { value: 'slack-finance', label: 'Slack #finance' },
    { value: 'slack-general', label: 'Slack #general' },
    { value: 'teams-audit', label: 'Microsoft Teams · Audit' },
  ];

  readonly displayName = computed(() => this.user()?.fullName || 'Account');
  readonly initials = computed(() => this.toInitials(this.user()?.fullName || ''));
  readonly unreadCount = computed(() => (this.settings().inAppAlerts ? this.alerts().length : 0));

  constructor() {
    this.analyticsService.getDashboard(new Date().getFullYear())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => this.alerts.set(dashboard.urgentActions ?? []),
        error: () => this.alerts.set([]),
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.notify-wrap')) {
      return;
    }
    this.notificationsOpen.set(false);
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.notificationsOpen.update((open) => !open);
  }

  toggle(key: BooleanSettingKey): void {
    this.patch({ [key]: !this.settings()[key] });
  }

  onNumberSelect(key: NumberSettingKey, event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.patch({ [key]: value });
  }

  onTextSelect(key: 'slackChannel' | 'dateFormat' | 'weekStartsOn', event: Event): void {
    const value = (event.target as HTMLSelectElement).value as UserAppSettings[typeof key];
    this.patch({ [key]: value });
  }

  onNumberInput(key: NumberSettingKey, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.patch({ [key]: value });
  }

  onOptionalNumberInput(key: 'highLeakageThreshold', event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    this.patch({ [key]: raw === '' ? null : Number(raw) });
  }

  onNewPaymentSelect(key: 'brand', event: Event): void {
    const value = (event.target as HTMLSelectElement).value as CardBrand;
    this.newPayment.update((current) => ({ ...current, [key]: value }));
  }

  onNewPaymentText(key: 'last4' | 'expiryMonth' | 'expiryYear' | 'nickname', event: Event): void {
    let value = (event.target as HTMLInputElement).value;
    if (key !== 'nickname') {
      value = value.replace(/\D/g, '');
    }
    this.newPayment.update((current) => ({ ...current, [key]: value }));
  }

  addPayment(): void {
    this.clearMessages();
    const draft = this.newPayment();
    if (!/^\d{4}$/.test(draft.last4)) {
      this.errorMessage.set('Enter the last 4 digits of the card.');
      return;
    }
    const month = Number(draft.expiryMonth);
    const year = Number(draft.expiryYear);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !/^\d{2}$/.test(draft.expiryYear) || !Number.isInteger(year)) {
      this.errorMessage.set('Enter a valid expiration month and two-digit year.');
      return;
    }
    const method: PaymentMethodReminder = {
      id: crypto.randomUUID(),
      brand: draft.brand,
      last4: draft.last4,
      expiryMonth: String(month).padStart(2, '0'),
      expiryYear: draft.expiryYear,
      nickname: draft.nickname.trim(),
    };
    this.patch({ paymentMethods: [...this.settings().paymentMethods, method] });
    this.newPayment.set({ brand: 'visa', last4: '', expiryMonth: '', expiryYear: '', nickname: '' });
  }

  removePayment(id: string): void {
    this.patch({ paymentMethods: this.settings().paymentMethods.filter((method) => method.id !== id) });
  }

  brandLabel(brand: CardBrand): string {
    if (brand === 'visa') return 'Visa';
    if (brand === 'mastercard') return 'Mastercard';
    if (brand === 'amex') return 'American Express';
    return 'Card';
  }

  saveChanges(): void {
    this.clearMessages();
    const current = this.settings();
    if (!this.isValidSettings(current)) {
      return;
    }
    this.saving.set(true);
    try {
      this.settingsService.save(this.user()?.id, current);
      this.settings.set(this.settingsService.load(this.user()?.id));
      this.dirty.set(false);
      this.successMessage.set('Settings saved.');
    } catch {
      this.errorMessage.set('Unable to save settings. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/');
  }

  private patch(partial: Partial<UserAppSettings>): void {
    this.settings.update((current) => ({ ...current, ...partial }));
    this.dirty.set(true);
    this.clearMessages();
  }

  private isValidSettings(current: UserAppSettings): boolean {
    if (!Number.isInteger(current.urgentAlertDays) || current.urgentAlertDays < 1 || current.urgentAlertDays > 365) {
      this.errorMessage.set('Urgent alert days must be between 1 and 365.');
      this.activeTab.set('notifications');
      return false;
    }
    if (current.highLeakageThreshold !== null && (Number.isNaN(current.highLeakageThreshold) || current.highLeakageThreshold < 0)) {
      this.errorMessage.set('High financial leakage threshold must be a positive amount.');
      this.activeTab.set('notifications');
      return false;
    }
    if (!Number.isInteger(current.autoFlagUnusedDays) || current.autoFlagUnusedDays < 1 || current.autoFlagUnusedDays > 365) {
      this.errorMessage.set('Unused-subscription flag days must be between 1 and 365.');
      this.activeTab.set('audit');
      return false;
    }
    if (!Number.isInteger(current.autoFlagPriceHikePercent) || current.autoFlagPriceHikePercent < 1 || current.autoFlagPriceHikePercent > 100) {
      this.errorMessage.set('Price hike threshold must be between 1 and 100 percent.');
      this.activeTab.set('audit');
      return false;
    }
    if (!Number.isInteger(current.autoFlagRiskScore) || current.autoFlagRiskScore < 1 || current.autoFlagRiskScore > 100) {
      this.errorMessage.set('Risk score threshold must be between 1 and 100.');
      this.activeTab.set('audit');
      return false;
    }
    return true;
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private toInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'CA';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
}

type BooleanSettingKey =
  | 'contractExpiringSoon'
  | 'autoRenewalApproaching'
  | 'urgentCancellationWindow'
  | 'weeklyCostSummary'
  | 'inAppAlerts'
  | 'externalIntegration'
  | 'compactCards'
  | 'requireSnoozeConfirm';

type NumberSettingKey =
  | 'expiringSoonDays'
  | 'urgentAlertDays'
  | 'defaultReminderDays'
  | 'autoFlagUnusedDays'
  | 'autoFlagPriceHikePercent'
  | 'autoFlagRiskScore';
