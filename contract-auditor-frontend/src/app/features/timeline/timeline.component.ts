import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '../../core/services/analytics.service';
import { TimelineEvent } from '../../core/models/contract.models';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [DatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timeline-page">
      <header>
        <h1>Contract Timeline</h1>
        <p>Upcoming trial ends, renewal locks, and warranty expirations across {{ selectedYear() }}</p>
        <select [value]="selectedYear()" (change)="onYearChange($event)">
          @for (year of years; track year) {
            <option [value]="year">{{ year }}</option>
          }
        </select>
      </header>

      @if (loadError()) {
        <div class="error-state">
          <p>{{ loadError() }}</p>
          <button type="button" (click)="reload()">Retry</button>
        </div>
      } @else if (events().length === 0) {
        <p class="empty">No upcoming events for this year.</p>
      } @else {
        <div class="timeline">
          @for (event of events(); track trackByEvent($index, event)) {
            <article class="event" [class.urgent]="event.daysRemaining <= 7">
              <div class="date-col">
                <span class="month">{{ event.eventDate | date:'MMM' }}</span>
                <span class="day">{{ event.eventDate | date:'d' }}</span>
              </div>
              <div class="content">
                <div class="top">
                  <h3>{{ event.subscriptionName }}</h3>
                  <span class="badge">{{ formatEventType(event.eventType) }}</span>
                </div>
                <p class="meta">{{ event.provider }} · {{ event.category }} · {{ event.amount | money }}</p>
                <p class="deadline">
                  @if (event.daysRemaining >= 0) {
                    {{ event.daysRemaining }} days remaining · Action by {{ event.actionDeadline | date:'mediumDate' }}
                  } @else {
                    Event passed
                  }
                </p>
                @if (event.cancellationWorkflow) {
                  <details>
                    <summary>Cancellation workflow</summary>
                    <pre>{{ event.cancellationWorkflow }}</pre>
                  </details>
                }
                @if (event.negotiationWorkflow) {
                  <details>
                    <summary>Negotiation workflow</summary>
                    <pre>{{ event.negotiationWorkflow }}</pre>
                  </details>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .timeline-page { display: grid; gap: 1.25rem; }
    header { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; }
    h1 { margin: 0; color: #0f172a; }
    p { margin: 0; color: #64748b; }
    select { padding: .5rem .75rem; border-radius: 8px; border: 1px solid #cbd5e1; }
    .empty { color: #64748b; background: #fff; padding: 1.5rem; border-radius: 12px; }
    .error-state { background: #fff; padding: 1.5rem; border-radius: 12px; text-align: center; }
    .error-state p { margin: 0 0 0.75rem; }
    .error-state button { padding: 0.5rem 1rem; background: #4f61c8; color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .timeline { display: grid; gap: 1rem; }
    .event { display: grid; grid-template-columns: 72px 1fr; gap: 1rem; background: #fff; border-radius: 12px; padding: 1rem; box-shadow: 0 1px 3px rgba(15,23,42,.08); border-left: 4px solid #2563eb; }
    .event.urgent { border-left-color: #dc2626; }
    .date-col { text-align: center; background: #eff6ff; border-radius: 8px; padding: .5rem; }
    .month { display: block; font-size: .75rem; color: #2563eb; text-transform: uppercase; }
    .day { display: block; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
    .top { display: flex; justify-content: space-between; gap: .75rem; align-items: center; }
    h3 { margin: 0; color: #0f172a; }
    .badge { background: #e0e7ff; color: #3730a3; padding: .2rem .55rem; border-radius: 999px; font-size: .75rem; white-space: nowrap; }
    .meta, .deadline { font-size: .875rem; color: #64748b; margin: .35rem 0; }
    details { margin-top: .5rem; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: .8125rem; color: #334155; background: #f8fafc; padding: .75rem; border-radius: 8px; }
  `],
})
export class TimelineComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly events = signal<TimelineEvent[]>([]);
  readonly loadError = signal('');
  readonly selectedYear = signal(new Date().getFullYear());
  readonly years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  constructor() {
    this.loadTimeline(this.selectedYear());
  }

  onYearChange(event: Event): void {
    const year = Number((event.target as HTMLSelectElement).value);
    this.selectedYear.set(year);
    this.loadTimeline(year);
  }

  trackByEvent(_index: number, event: TimelineEvent): string {
    return `${event.subscriptionId}-${event.eventType}-${event.eventDate}`;
  }

  formatEventType(type: TimelineEvent['eventType']): string {
    return type.replaceAll('_', ' ');
  }

  reload(): void {
    this.loadTimeline(this.selectedYear());
  }

  private loadTimeline(year: number): void {
    this.loadError.set('');
    this.analyticsService.getTimeline(year)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (events) => this.events.set(events),
        error: (error) => this.loadError.set(
          userFacingHttpError(error, 'Unable to load the timeline. Please try again.'),
        ),
      });
  }
}
