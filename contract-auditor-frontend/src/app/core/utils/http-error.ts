import { HttpErrorResponse } from '@angular/common/http';

const BACKEND_UNAVAILABLE_STATUSES = new Set([0, 502, 503, 504]);

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'The request could not be processed. Please check your input and try again.',
  401: 'Invalid email or password.',
  403: 'You do not have permission to complete this action.',
  404: 'The requested record could not be found.',
  409: 'This action conflicts with existing data.',
  422: 'The request could not be processed. Please check your input and try again.',
  500: 'Something went wrong on our side. Please try again in a moment.',
};

export function isBackendUnavailable(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  return BACKEND_UNAVAILABLE_STATUSES.has(error.status);
}

export function userFacingHttpError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (isBackendUnavailable(error)) {
    return 'The application server is currently unavailable. Please try again in a few minutes.';
  }

  const apiMessage = readApiMessage(error);
  if (apiMessage) {
    return apiMessage;
  }

  return FALLBACK_MESSAGES[error.status] ?? fallback;
}

function readApiMessage(error: HttpErrorResponse): string | null {
  const body = error.error;
  if (typeof body === 'string' && body.trim().length > 0 && body.length < 300) {
    return body;
  }
  if (body && typeof body === 'object' && typeof body.message === 'string' && body.message.trim().length > 0) {
    return body.message;
  }
  return null;
}
