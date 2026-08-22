import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UrgentAction } from '../../core/models/contract.models';
import { MoneyPipe } from '../pipes/money.pipe';

@Component({
  selector: 'app-urgent-action-cards',
  standalone: true,
  imports: [DatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="urgent-section">
      <h3 class="section-title">Deadline Radar</h3>

      @if (mostUrgent(); as urgent) {
        <div class="urgent-banner" [class]="urgent.urgencyLevel.toLowerCase()">
          <div class="banner-content">
            <span class="banner-label">Most Urgent — Action Required</span>
            <strong>{{ urgent.subscriptionName }}</strong>
            <span>cancellation deadline in {{ urgent.daysUntilDeadline }} day{{ urgent.daysUntilDeadline === 1 ? '' : 's' }}</span>
          </div>
          <div class="banner-actions">
            <button type="button" class="btn-outline" (click)="cancelAssistant.emit(urgent)">Cancel Assistant</button>
            <button type="button" class="btn-primary" (click)="markRenewed.emit(urgent.subscriptionId)">Mark Renewed</button>
          </div>
        </div>
      }

      @if (actions().length === 0) {
        <div class="empty-state">
          <span class="check-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
          <p>No urgent deadlines in the next 7 days. You're all caught up!</p>
        </div>
      } @else {
        <div class="cards-grid">
          @for (action of actions(); track action.subscriptionId) {
            <article class="action-card" [class]="action.urgencyLevel.toLowerCase()">
              <div class="card-header">
                <h4>{{ action.subscriptionName }}</h4>
                <span class="badge" [class]="action.urgencyLevel.toLowerCase()">
                  {{ action.daysUntilDeadline }}d
                </span>
              </div>
              <p class="meta">{{ action.provider }} · {{ action.category }}</p>
              <p class="deadline">Cancel by {{ action.cancellationDeadline | date:'mediumDate' }}</p>
              <p class="amount">{{ action.amount | money }}</p>
              <div class="card-actions">
                <button type="button" class="btn-sm" (click)="cancelAssistant.emit(action)">Cancel Assistant</button>
                <button type="button" class="btn-sm secondary" (click)="snooze.emit(action.subscriptionId)">Snooze</button>
                <button type="button" class="btn-sm primary" (click)="markRenewed.emit(action.subscriptionId)">Mark Renewed</button>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .urgent-section {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    }
    .section-title {
      margin: 0 0 1rem;
      color: #0f172a;
      font-size: 0.9375rem;
      font-weight: 600;
    }
    .empty-state {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.25rem 0;
    }
    .check-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #dcfce7;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .empty-state p {
      margin: 0;
      color: #64748b;
      font-size: 0.875rem;
    }
    .urgent-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      color: #fff;
      margin-bottom: 1rem;
    }
    .urgent-banner.red { background: linear-gradient(135deg, #dc2626, #b91c1c); }
    .urgent-banner.yellow { background: linear-gradient(135deg, #d97706, #b45309); }
    .urgent-banner.green { background: linear-gradient(135deg, #16a34a, #15803d); }
    .banner-label {
      display: block;
      font-size: 0.75rem;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .banner-content strong { display: block; font-size: 1.25rem; margin: 0.25rem 0; }
    .banner-actions { display: flex; gap: 0.5rem; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .action-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 1rem;
      border-left: 4px solid #64748b;
    }
    .action-card.red { border-left-color: #dc2626; }
    .action-card.yellow { border-left-color: #d97706; }
    .action-card.green { border-left-color: #16a34a; }
    .card-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    h4 { margin: 0; color: #0f172a; font-size: 0.9375rem; }
    .badge { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; color: #fff; }
    .badge.red { background: #dc2626; }
    .badge.yellow { background: #d97706; }
    .badge.green { background: #16a34a; }
    .meta, .deadline { font-size: 0.8125rem; color: #64748b; margin: 0.35rem 0; }
    .amount { font-weight: 600; color: #0f172a; margin: 0.5rem 0; }
    .card-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .btn-sm {
      padding: 0.35rem 0.6rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      color: #334155;
    }
    .btn-sm.primary { background: #4f61c8; color: #fff; border-color: #4f61c8; }
    .btn-sm.secondary { background: #f1f5f9; }
    .btn-primary {
      padding: 0.5rem 1rem;
      background: #fff;
      color: #0f172a;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-outline {
      padding: 0.5rem 1rem;
      background: transparent;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }
  `],
})
export class UrgentActionCardsComponent {
  readonly actions = input.required<UrgentAction[]>();
  readonly mostUrgent = input<UrgentAction | null>(null);

  readonly cancelAssistant = output<UrgentAction>();
  readonly snooze = output<number>();
  readonly markRenewed = output<number>();
}
