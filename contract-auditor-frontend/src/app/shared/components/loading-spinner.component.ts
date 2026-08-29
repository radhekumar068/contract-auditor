import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="spinner-wrap"
      [class.centered]="centered()"
      [attr.role]="label() ? 'status' : 'presentation'"
      [attr.aria-label]="label() || null"
      [attr.aria-hidden]="label() ? null : 'true'"
    >
      <span class="spinner" [style.width.px]="size()" [style.height.px]="size()"></span>
      @if (label()) {
        <span class="spinner-label">{{ label() }}</span>
      }
    </div>
  `,
  styles: [`
    .spinner-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
    }
    .spinner-wrap.centered {
      flex-direction: column;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      width: 100%;
    }
    .spinner {
      display: inline-block;
      flex-shrink: 0;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .spinner-label {
      color: #64748b;
      font-size: 0.875rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class LoadingSpinnerComponent {
  readonly size = input(32);
  readonly label = input<string | undefined>(undefined);
  readonly centered = input(false);
}
