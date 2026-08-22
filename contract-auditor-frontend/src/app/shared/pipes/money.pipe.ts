import { Pipe, PipeTransform, inject } from '@angular/core';
import { DEFAULT_CURRENCY } from '../../core/constants/countries';
import { AuthService } from '../../core/services/auth.service';

@Pipe({
  name: 'money',
  standalone: true,
  pure: false,
})
export class MoneyPipe implements PipeTransform {
  private readonly authService = inject(AuthService);

  transform(
    value: number | null | undefined,
    digitsInfo = '1.2-2',
    currency?: string | null,
  ): string {
    if (value == null || Number.isNaN(value)) {
      return '';
    }
    const code = (currency || this.authService.currentUser()?.preferredCurrency || DEFAULT_CURRENCY).toUpperCase();
    const { minimumFractionDigits, maximumFractionDigits } = parseDigits(digitsInfo);
    const locale = code === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  }
}

function parseDigits(digitsInfo: string): { minimumFractionDigits: number; maximumFractionDigits: number } {
  const match = /^1\.(\d+)-(\d+)$/.exec(digitsInfo);
  if (!match) {
    return { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  }
  return {
    minimumFractionDigits: Number(match[1]),
    maximumFractionDigits: Number(match[2]),
  };
}
