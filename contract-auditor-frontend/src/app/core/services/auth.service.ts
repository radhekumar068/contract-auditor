import { Injectable, signal } from '@angular/core';
import { DEFAULT_COUNTRY_CODE, DEFAULT_CURRENCY } from '../constants/countries';
import { User } from '../models/contract.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'contract_auditor_token';
  private readonly userKey = 'contract_auditor_user';

  private accessToken: string | null = null;

  readonly currentUser = signal<User | null>(null);

  constructor() {
    this.clearPersistedSession();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  setSession(token: string, user: User): void {
    this.accessToken = token;
    this.currentUser.set(this.normalizeUser(user));
  }

  updateCurrentUser(user: User): void {
    this.currentUser.set(this.normalizeUser(user));
  }

  logout(): void {
    this.accessToken = null;
    this.currentUser.set(null);
    this.clearPersistedSession();
  }

  private clearPersistedSession(): void {
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
