import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateSubscriptionPayload, Page, RenewalHistory, Subscription } from '../models/contract.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/subscriptions`;

  list(page = 0, size = 20): Observable<Page<Subscription>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'name,asc');
    return this.http.get<Page<Subscription>>(this.baseUrl, { params });
  }

  listAll(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.baseUrl}/all`);
  }

  getById(id: number): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateSubscriptionPayload): Observable<Subscription> {
    return this.http.post<Subscription>(this.baseUrl, payload);
  }

  update(id: number, payload: unknown): Observable<Subscription> {
    return this.http.put<Subscription>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  recordRenewal(id: number, payload: unknown): Observable<RenewalHistory> {
    return this.http.post<RenewalHistory>(`${this.baseUrl}/${id}/renewals`, payload);
  }

  getRenewalHistory(id: number): Observable<RenewalHistory[]> {
    return this.http.get<RenewalHistory[]>(`${this.baseUrl}/${id}/renewals`);
  }

  snooze(id: number, days = 7): Observable<Subscription> {
    const params = new HttpParams().set('days', days);
    return this.http.post<Subscription>(`${this.baseUrl}/${id}/snooze`, null, { params });
  }

  markRenewed(id: number): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.baseUrl}/${id}/mark-renewed`, null);
  }
}
