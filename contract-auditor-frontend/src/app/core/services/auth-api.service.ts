import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, UserRole } from '../models/contract.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  register(payload: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    countryCode: string;
    role: UserRole;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap((response) => this.authService.setSession(response.accessToken, response.user)),
    );
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((response) => this.authService.setSession(response.accessToken, response.user)),
    );
  }

  forgotPassword(payload: { email: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, payload);
  }

  validateResetToken(token: string): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${environment.apiUrl}/auth/reset-password/validate`, {
      params: { token },
    });
  }

  resetPassword(payload: { token: string; newPassword: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, payload);
  }
}
