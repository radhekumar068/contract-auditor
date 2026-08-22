import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile, UpdateProfileResponse } from '../models/contract.models';

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users/me`;

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(this.baseUrl);
  }

  updateProfile(payload: { fullName: string; email: string; countryCode: string }): Observable<UpdateProfileResponse> {
    return this.http.put<UpdateProfileResponse>(this.baseUrl, payload);
  }

  changePassword(payload: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/password`, payload);
  }
}
