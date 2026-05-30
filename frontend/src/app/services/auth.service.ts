import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { User } from '../models/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);
  private _users = signal<User[]>([]);
  private _token = signal<string | null>(localStorage.getItem('fb_token'));
  private _loading = signal(false);

  user = this._user.asReadonly();
  users = this._users.asReadonly();
  token = this._token.asReadonly();
  loading = this._loading.asReadonly();
  isAuthenticated = computed(() => !!this._token());

  constructor(private http: HttpClient, private router: Router) {
    const token = this._token();
    if (token) {
      const exp = this.getTokenExpiry(token);
      if (exp && exp * 1000 > Date.now()) {
        this.loadUser();
      } else {
        this.logout();
      }
    }
  }

  register(name: string, email: string, password: string): Observable<any> {
    this._loading.set(true);
    return this.http.post(`${environment.apiUrl}/auth/register`, { name, email, password }).pipe(
      tap((res: any) => {
        this.setToken(res.access_token);
        this.loadUser();
        this._loading.set(false);
      }),
      catchError((err) => {
        this._loading.set(false);
        throw err;
      })
    );
  }

  login(email: string, password: string): Observable<any> {
    this._loading.set(true);
    return this.http.post(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res: any) => {
        this.setToken(res.access_token);
        this.loadUser();
        this._loading.set(false);
      }),
      catchError((err) => {
        this._loading.set(false);
        throw err;
      })
    );
  }

  loadUser(): void {
    const token = this._token();
    if (!token) return;
    this.http.get<User>(`${environment.apiUrl}/auth/me`).subscribe({
    next: (user) => {

      const savedUser = localStorage.getItem('user');

      if (savedUser) {
        this._user.set(JSON.parse(savedUser));
      } else {
        this._user.set(user);
      }

      this.loadUsers();
    },
      error: () => this.logout(),
    });
  }

  loadUsers(): void {
    this.http.get<User[]>(`${environment.apiUrl}/auth/users`).subscribe({
      next: (users) => this._users.set(users),
      error: (err) => console.error('Failed to load users', err)
    });
  }
  setUser(user: User): void {
  this._user.set(user);
  }
  logout(): void {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_token_exp');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  private setToken(token: string): void {
    localStorage.setItem('fb_token', token);
    const exp = this.getTokenExpiry(token);
    if (exp) {
      localStorage.setItem('fb_token_exp', String(exp));
    }
    this._token.set(token);
  }

  getToken(): string | null {
    const token = this._token();
    if (!token) return null;
    const expStr = localStorage.getItem('fb_token_exp');
    const exp = expStr ? Number(expStr) : this.getTokenExpiry(token);
    if (exp && exp * 1000 <= Date.now()) {
      this.logout();
      return null;
    }
    return token;
  }

  private getTokenExpiry(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1];
      // base64url decode
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const obj = JSON.parse(json);
      return obj.exp ?? null;
    } catch (e) {
      return null;
    }
  }
}
