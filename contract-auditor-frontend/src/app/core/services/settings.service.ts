import { Injectable } from '@angular/core';

export type SettingsTab = 'general' | 'notifications' | 'audit' | 'payments';
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'other';

export interface PaymentMethodReminder {
  id: string;
  brand: CardBrand;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  nickname: string;
}

export interface UserAppSettings {
  contractExpiringSoon: boolean;
  expiringSoonDays: number;
  autoRenewalApproaching: boolean;
  urgentCancellationWindow: boolean;
  weeklyCostSummary: boolean;
  inAppAlerts: boolean;
  externalIntegration: boolean;
  slackChannel: string;
  urgentAlertDays: number;
  highLeakageThreshold: number | null;
  dateFormat: 'MDY' | 'DMY' | 'YMD';
  weekStartsOn: 'sunday' | 'monday';
  defaultReminderDays: number;
  compactCards: boolean;
  autoFlagUnusedDays: number;
  autoFlagPriceHikePercent: number;
  autoFlagRiskScore: number;
  requireSnoozeConfirm: boolean;
  paymentMethods: PaymentMethodReminder[];
}

export const DEFAULT_SETTINGS: UserAppSettings = {
  contractExpiringSoon: true,
  expiringSoonDays: 30,
  autoRenewalApproaching: true,
  urgentCancellationWindow: true,
  weeklyCostSummary: true,
  inAppAlerts: true,
  externalIntegration: true,
  slackChannel: 'slack-audit-alerts',
  urgentAlertDays: 1,
  highLeakageThreshold: null,
  dateFormat: 'MDY',
  weekStartsOn: 'monday',
  defaultReminderDays: 14,
  compactCards: false,
  autoFlagUnusedDays: 45,
  autoFlagPriceHikePercent: 10,
  autoFlagRiskScore: 70,
  requireSnoozeConfirm: true,
  paymentMethods: [],
};

const EXPIRING_DAY_OPTIONS = new Set([7, 14, 30, 60, 90]);
const SLACK_CHANNELS = new Set([
  'slack-audit-alerts',
  'slack-finance',
  'slack-general',
  'teams-audit',
]);

@Injectable({ providedIn: 'root' })
export class SettingsService {
  load(userId: number | undefined): UserAppSettings {
    try {
      const raw = localStorage.getItem(this.storageKey(userId));
      if (!raw) {
        return this.cloneDefaults();
      }
      const parsed = JSON.parse(raw) as Partial<UserAppSettings>;
      return this.normalize(parsed);
    } catch {
      return this.cloneDefaults();
    }
  }

  save(userId: number | undefined, settings: UserAppSettings): void {
    localStorage.setItem(this.storageKey(userId), JSON.stringify(this.normalize(settings)));
  }

  private storageKey(userId: number | undefined): string {
    return `contract_auditor_settings_${userId ?? 'guest'}`;
  }

  private cloneDefaults(): UserAppSettings {
    return {
      ...DEFAULT_SETTINGS,
      paymentMethods: [],
    };
  }

  private normalize(input: Partial<UserAppSettings>): UserAppSettings {
    const merged: UserAppSettings = {
      ...this.cloneDefaults(),
      ...input,
      paymentMethods: Array.isArray(input.paymentMethods)
        ? input.paymentMethods
            .filter((method) => method && /^\d{4}$/.test(method.last4 ?? ''))
            .map((method) => ({
              id: method.id || crypto.randomUUID(),
              brand: this.normalizeBrand(method.brand),
              last4: method.last4,
              expiryMonth: this.padMonth(method.expiryMonth),
              expiryYear: String(method.expiryYear ?? '').slice(-2),
              nickname: (method.nickname ?? '').trim().slice(0, 80),
            }))
        : [],
    };

    merged.expiringSoonDays = EXPIRING_DAY_OPTIONS.has(Number(merged.expiringSoonDays))
      ? Number(merged.expiringSoonDays)
      : 30;
    merged.slackChannel = SLACK_CHANNELS.has(merged.slackChannel)
      ? merged.slackChannel
      : 'slack-audit-alerts';
    merged.urgentAlertDays = this.clampInt(merged.urgentAlertDays, 1, 365, 1);
    merged.highLeakageThreshold =
      merged.highLeakageThreshold === null || merged.highLeakageThreshold === undefined || Number.isNaN(Number(merged.highLeakageThreshold))
        ? null
        : Math.max(0, Number(merged.highLeakageThreshold));
    merged.defaultReminderDays = this.clampInt(merged.defaultReminderDays, 1, 180, 14);
    merged.autoFlagUnusedDays = this.clampInt(merged.autoFlagUnusedDays, 1, 365, 45);
    merged.autoFlagPriceHikePercent = this.clampInt(merged.autoFlagPriceHikePercent, 1, 100, 10);
    merged.autoFlagRiskScore = this.clampInt(merged.autoFlagRiskScore, 1, 100, 70);
    merged.dateFormat = merged.dateFormat === 'DMY' || merged.dateFormat === 'YMD' ? merged.dateFormat : 'MDY';
    merged.weekStartsOn = merged.weekStartsOn === 'sunday' ? 'sunday' : 'monday';
    merged.contractExpiringSoon = Boolean(merged.contractExpiringSoon);
    merged.autoRenewalApproaching = Boolean(merged.autoRenewalApproaching);
    merged.urgentCancellationWindow = Boolean(merged.urgentCancellationWindow);
    merged.weeklyCostSummary = Boolean(merged.weeklyCostSummary);
    merged.inAppAlerts = Boolean(merged.inAppAlerts);
    merged.externalIntegration = Boolean(merged.externalIntegration);
    merged.compactCards = Boolean(merged.compactCards);
    merged.requireSnoozeConfirm = Boolean(merged.requireSnoozeConfirm);
    return merged;
  }

  private normalizeBrand(brand: string | undefined): CardBrand {
    if (brand === 'visa' || brand === 'mastercard' || brand === 'amex' || brand === 'other') {
      return brand;
    }
    return 'other';
  }

  private padMonth(value: string | undefined): string {
    const month = Number(value);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return '01';
    }
    return String(month).padStart(2, '0');
  }

  private clampInt(value: number, min: number, max: number, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(parsed)));
  }
}
