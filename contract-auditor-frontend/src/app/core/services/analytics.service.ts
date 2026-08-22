import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Analytics, CalendarDay, Dashboard, TimelineEvent } from '../models/contract.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/analytics`;

  getAnalytics(year: number): Observable<Analytics> {
    const params = new HttpParams().set('year', year);
    return this.http.get<Analytics>(this.baseUrl, { params });
  }

  getDashboard(year: number): Observable<Dashboard> {
    const params = new HttpParams().set('year', year);
    return this.http.get<Dashboard>(`${this.baseUrl}/dashboard`, { params });
  }

  getTimeline(year: number): Observable<TimelineEvent[]> {
    const params = new HttpParams().set('year', year);
    return this.http.get<TimelineEvent[]>(`${this.baseUrl}/timeline`, { params });
  }

  getCalendar(year: number, month: number): Observable<CalendarDay[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<CalendarDay[]>(`${this.baseUrl}/calendar`, { params });
  }
}
