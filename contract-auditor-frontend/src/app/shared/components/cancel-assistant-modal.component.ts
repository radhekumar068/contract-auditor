import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UrgentAction } from '../../core/models/contract.models';

@Component({
  selector: 'app-cancel-assistant-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (action()) {
      <div class="overlay" (click)="close.emit()" role="dialog" aria-modal="true">
        <div class="modal" (click)="$event.stopPropagation()">
          <header>
            <h2>Cancel Assistant — {{ action()!.subscriptionName }}</h2>
            <button type="button" class="close-btn" (click)="close.emit()" aria-label="Close">&times;</button>
          </header>
          <div class="content">
            <p class="intro">Follow these steps to cancel your <strong>{{ action()!.provider }}</strong> subscription before the deadline:</p>
            @if (action()!.cancellationWorkflow) {
              <ol class="steps">
                @for (step of steps(); track $index) {
                  <li>{{ step }}</li>
                }
              </ol>
            } @else {
              <p class="fallback">No cancellation workflow saved. Check {{ action()!.provider }} account settings under Billing or Subscription management.</p>
            }
            <div class="tip">
              <strong>Tip:</strong> Cancellation deadline is {{ action()!.cancellationDeadline }}. Renew date: {{ action()!.renewalDate }}.
            </div>
          </div>
          <footer>
            <button type="button" class="btn-secondary" (click)="close.emit()">Close</button>
            <button type="button" class="btn-primary" (click)="markPendingCancel.emit(action()!.subscriptionId)">Mark Pending Cancel</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      overflow-y: auto;
    }
    .modal {
      background: #fff;
      border-radius: 16px;
      max-width: 520px;
      width: 100%;
      min-width: 0;
      max-height: calc(100dvh - 2rem);
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
      margin: auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    h2 { margin: 0; font-size: 1.125rem; color: #0f172a; min-width: 0; }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #64748b;
      line-height: 1;
      flex-shrink: 0;
    }
    .content { padding: 1.5rem; min-width: 0; }
    .intro { color: #334155; margin: 0 0 1rem; }
    .steps { margin: 0; padding-left: 1.25rem; color: #334155; display: grid; gap: 0.75rem; }
    .fallback { color: #64748b; background: #f8fafc; padding: 1rem; border-radius: 8px; }
    .tip { margin-top: 1rem; padding: 0.75rem 1rem; background: #eff6ff; border-radius: 8px; font-size: 0.875rem; color: #1e40af; }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }
    .btn-primary {
      padding: 0.55rem 1rem;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary {
      padding: 0.55rem 1rem;
      background: #f1f5f9;
      color: #334155;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    @media (max-width: 640px) {
      .overlay { align-items: flex-start; padding: 0.75rem; }
      .modal { max-height: calc(100dvh - 1.5rem); border-radius: 12px; }
      header, .content, footer { padding: 1rem; }
      h2 { font-size: 1rem; }
      footer { flex-direction: column-reverse; }
      footer .btn-primary,
      footer .btn-secondary { width: 100%; text-align: center; }
    }
  `],
})
export class CancelAssistantModalComponent {
  readonly action = input<UrgentAction | null>(null);
  readonly close = output<void>();
  readonly markPendingCancel = output<number>();

  readonly steps = computed(() => {
    const workflow = this.action()?.cancellationWorkflow;
    if (!workflow) return [];
    return workflow.split('→').map((s) => s.trim()).filter(Boolean);
  });
}
