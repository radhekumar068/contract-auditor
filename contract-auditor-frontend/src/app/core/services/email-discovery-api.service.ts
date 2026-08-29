import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DiscoveredSubscription,
  EmailConnectionStatus,
  EmailDiscoveryAuthUrl,
  EmailDiscoveryImportResult,
  EmailDiscoveryScanResult,
} from '../models/contract.models';

@Injectable({ providedIn: 'root' })
export class EmailDiscoveryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/email-discovery`;

  getStatus(): Observable<EmailConnectionStatus> {
    return this.http.get<EmailConnectionStatus>(`${this.baseUrl}/status`);
  }

  getAuthUrl(): Observable<EmailDiscoveryAuthUrl> {
    return this.http.get<EmailDiscoveryAuthUrl>(`${this.baseUrl}/auth-url`);
  }

  connect(code: string, state: string): Observable<EmailConnectionStatus> {
    return this.http.post<EmailConnectionStatus>(`${this.baseUrl}/connect`, { code, state });
  }

  scan(): Observable<EmailDiscoveryScanResult> {
    return this.http.post<EmailDiscoveryScanResult>(`${this.baseUrl}/scan`, {});
  }

  importSelected(suggestions: DiscoveredSubscription[]): Observable<EmailDiscoveryImportResult> {
    return this.http.post<EmailDiscoveryImportResult>(`${this.baseUrl}/import`, { suggestions });
  }

  disconnect(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/disconnect`);
  }
}
