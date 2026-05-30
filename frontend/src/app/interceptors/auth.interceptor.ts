import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const router = inject(Router);
  const token = localStorage.getItem('fb_token');

  let modifiedReq = req;
  if (token) {
    modifiedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        localStorage.removeItem('fb_token');
        router.navigate(['/login']);
        toastService.error('Session expired. Please log in again.');
      } else if (error.status !== 401) {
        const msg = error.error?.detail || error.message || 'An error occurred';
        toastService.error(msg);
      }
      return throwError(() => error);
    })
  );
};
