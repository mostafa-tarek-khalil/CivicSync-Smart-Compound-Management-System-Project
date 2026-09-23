import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      _id: string;
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      phone?: string;
      unitId?: string | null;
    };
  };
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

interface MeResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    profileImage: string | null;
    unitId: string | null;
    specializations: string[];
    rating: number;
    totalReviews: number;
    lastLoginAt: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, {
        email,
        password
      })
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        })
      );
  }

  register(
    data: {
      name: string;
      phone: string;
      email: string;
      password: string;
      role: 'RESIDENT' | 'TECHNICIAN' | 'SECURITY';
      unitId?: string;
      specializations?: string[];
    }
  ): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.apiUrl}/register`,
      data
    );
  }

  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(
      `${this.apiUrl}/me`
    );
  }

  updateProfile(data: {
    name?: string;
    phone?: string;
    profileImage?: string | null;
  }): Observable<MeResponse> {
    return this.http
      .patch<MeResponse>(`${this.apiUrl}/me`, data)
      .pipe(
        tap(response => {
          // Keep the cached user in localStorage in sync so the topbar and
          // guards reflect the latest profile immediately.
          const cached = this.getUser();
          if (cached && response?.data) {
            localStorage.setItem(
              'user',
              JSON.stringify({
                ...cached,
                name: response.data.name,
                phone: response.data.phone,
                profileImage: response.data.profileImage
              })
            );
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): LoginResponse['data']['user'] | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}