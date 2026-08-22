import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private readonly http = inject(HttpClient);

  readonly unavailable = signal(false);

  check(): Observable<boolean> {
    return this.http.get<{ status?: string }>(`${environment.apiUrl}/health`).pipe(
      map((response) => response?.status === 'UP'),
    );
  }

  markUnavailable(): void {
    this.unavailable.set(true);
  }

  markAvailable(): void {
    this.unavailable.set(false);
  }
}
