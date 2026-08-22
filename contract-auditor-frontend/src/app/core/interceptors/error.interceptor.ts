import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { HealthApiService } from '../services/health-api.service';
import { isBackendUnavailable } from '../utils/http-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const healthApi = inject(HealthApiService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isBackendUnavailable(error) && !req.url.includes('/health')) {
        healthApi.markUnavailable();
        const currentUrl = router.url;
        if (!currentUrl.startsWith('/error/unavailable')) {
          void router.navigate(['/error/unavailable'], {
            queryParams: { returnUrl: currentUrl && currentUrl !== '/' ? currentUrl : '/' },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
