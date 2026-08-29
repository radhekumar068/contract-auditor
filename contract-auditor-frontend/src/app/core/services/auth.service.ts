import { Injectable, signal } from '@angular/core';
import { DEFAULT_COUNTRY_CODE, DEFAULT_CURRENCY } from '../constants/countries';
import { User } from '../models/contract.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'contract_auditor_token';
  private readonly userKey = 'contract_auditor_user';
  static readonly phonePromptDismissedKey = 'phone_prompt_dismissed';

  private accessToken: string | null = null;

  readonly currentUser = signal<User | null>(null);

  constructor() {
    this.restoreSession();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  setSession(token: string, user: User): void {
    const normalized = this.normalizeUser(user);
    this.accessToken = token;
    this.currentUser.set(normalized);
    this.persistSession(token, normalized);
  }

  updateCurrentUser(user: User): void {
    const normalized = this.normalizeUser(user);
    this.currentUser.set(normalized);
    if (this.accessToken) {
      this.persistSession(this.accessToken, normalized);
    }
  }

  logout(): void {
    this.accessToken = null;
    this.currentUser.set(null);
    sessionStorage.removeItem(AuthService.phonePromptDismissedKey);
    this.clearPersistedSession();
  }

  private restoreSession(): void {
    try {
      const token = sessionStorage.getItem(this.tokenKey);
      const userRaw = sessionStorage.getItem(this.userKey);
      if (!token || !userRaw) {
        this.clearPersistedSession();
        return;
      }
      const user = JSON.parse(userRaw) as User;
      this.accessToken = token;
      this.currentUser.set(this.normalizeUser(user));
    } catch {
      this.clearPersistedSession();
    }
  }

  private persistSession(token: string, user: User): void {
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private clearPersistedSession(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  private normalizeUser(user: User): User {
    return {
      ...user,
      countryCode: user.countryCode || DEFAULT_COUNTRY_CODE,
      preferredCurrency: user.preferredCurrency || DEFAULT_CURRENCY,
    };
  }
}
