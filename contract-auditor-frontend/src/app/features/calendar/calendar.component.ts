import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '../../core/services/analytics.service';
import { CalendarDay } from '../../core/models/contract.models';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { userFacingHttpError } from '../../core/utils/http-error';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [DatePipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="calendar-page">
      <header class="page-header">
        <div>
          <h1>Contract Pulse</h1>
          <p>Visual billing calendar for {{ monthLabel() }} {{ selectedYear() }}</p>
        </div>
        <div class="nav-month">
          <button type="button" (click)="prevMonth()">←</button>
          <span>{{ monthLabel() }} {{ selectedYear() }}</span>
          <button type="button" (click)="nextMonth()">→</button>
        </div>
      </header>

      @if (loadError()) {
        <div class="error-state">
          <p>{{ loadError() }}</p>
          <button type="button" (click)="reload()">Retry</button>
        </div>
      }

      <div class="calendar-grid">
        @for (day of weekDays; track day) {
          <div class="weekday">{{ day }}</div>
        }
        @for (cell of calendarCells(); track cell.key) {
          <div
            class="day-cell"
            [class.outside]="!cell.inMonth"
            [class.today]="cell.isToday"
            [class.has-events]="cell.events.length > 0"
            (mouseenter)="hoveredDay.set(cell)"
            (mouseleave)="hoveredDay.set(null)"
          >
            <span class="day-num">{{ cell.day }}</span>
            @if (cell.events.length > 0) {
              <div class="dots">
                @for (ev of cell.events.slice(0, 3); track ev.subscriptionId + ev.eventType) {
                  <span class="dot" [class]="ev.eventType.toLowerCase()"></span>
                }
              </div>
            }
          </div>
        }
      </div>

      @if (hoveredDay(); as cell) {
        @if (cell.events.length > 0) {
          <div class="tooltip">
            <strong>{{ cell.date | date:'fullDate' }}</strong>
            <p class="tooltip-total">Total: {{ cell.totalAmount | money }}</p>
            <ul>
              @for (ev of cell.events; track ev.subscriptionId + ev.eventType) {
                <li>
                  <span class="ev-type">{{ formatEventType(ev.eventType) }}</span>
                  {{ ev.subscriptionName }} — {{ ev.amount | money }}
                </li>
              }
            </ul>
          </div>
        }
      }

      <div class="legend">
        <span><span class="dot renewal"></span> Renewal</span>
        <span><span class="dot trial_end"></span> Trial End</span>
        <span><span class="dot cancellation_deadline"></span> Cancel Deadline</span>
      </div>
    </div>
  `,
  styles: [`
    .calendar-page { display: grid; gap: 1.5rem; max-width: 900px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    h1 { margin: 0; color: #0f172a; }
    p { margin: .35rem 0 0; color: #64748b; }
    .nav-month { display: flex; align-items: center; gap: 1rem; }
    .nav-month button { width: 36px; height: 36px; border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; cursor: pointer; font-size: 1rem; }
    .nav-month span { font-weight: 600; min-width: 140px; text-align: center; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; background: #fff; border-radius: 12px; padding: 1rem; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
    .weekday { text-align: center; font-size: .75rem; font-weight: 600; color: #64748b; padding: .5rem; }
    .day-cell { min-height: 72px; padding: .5rem; border-radius: 8px; border: 1px solid #f1f5f9; position: relative; cursor: default; transition: background .15s; }
    .day-cell:hover { background: #f8fafc; }
    .day-cell.outside { opacity: .35; }
    .day-cell.today { border-color: #2563eb; background: #eff6ff; }
    .day-cell.has-events .day-num { font-weight: 700; }
    .day-num { font-size: .875rem; color: #334155; }
    .dots { display: flex; gap: 3px; margin-top: .35rem; flex-wrap: wrap; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot.renewal { background: #2563eb; }
    .dot.trial_end { background: #7c3aed; }
    .dot.cancellation_deadline { background: #dc2626; }
    .tooltip { background: #0f172a; color: #fff; border-radius: 12px; padding: 1rem 1.25rem; box-shadow: 0 8px 24px rgba(15,23,42,.2); }
    .tooltip strong { display: block; margin-bottom: .5rem; }
    .tooltip-total { color: #94a3b8; font-size: .875rem; margin: 0 0 .75rem; }
    .tooltip ul { margin: 0; padding: 0; list-style: none; display: grid; gap: .35rem; font-size: .8125rem; }
    .ev-type { color: #93c5fd; font-size: .75rem; margin-right: .35rem; }
    .legend { display: flex; gap: 1.5rem; font-size: .8125rem; color: #64748b; }
    .legend .dot { margin-right: .35rem; }
    .error-state { background: #fff; padding: 1.25rem; border-radius: 12px; text-align: center; }
    .error-state p { margin: 0 0 0.75rem; color: #64748b; }
    .error-state button { padding: 0.5rem 1rem; background: #4f61c8; color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
  `],
})
export class CalendarComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly selectedYear = signal(new Date().getFullYear());
  readonly selectedMonth = signal(new Date().getMonth() + 1);
  readonly calendarData = signal<CalendarDay[]>([]);
  readonly loadError = signal('');
  readonly hoveredDay = signal<CalendarCell | null>(null);

  readonly monthLabel = computed(() => {
    const date = new Date(this.selectedYear(), this.selectedMonth() - 1, 1);
    return date.toLocaleString('default', { month: 'long' });
  });

  readonly calendarCells = computed(() => this.buildCells());

  constructor() {
    this.loadCalendar();
  }

  prevMonth(): void {
    if (this.selectedMonth() === 1) {
      this.selectedMonth.set(12);
      this.selectedYear.update((y) => y - 1);
    } else {
      this.selectedMonth.update((m) => m - 1);
    }
    this.loadCalendar();
  }

  nextMonth(): void {
    if (this.selectedMonth() === 12) {
      this.selectedMonth.set(1);
      this.selectedYear.update((y) => y + 1);
    } else {
      this.selectedMonth.update((m) => m + 1);
    }
    this.loadCalendar();
  }

  formatEventType(type: string): string {
    return type.replaceAll('_', ' ');
  }

  reload(): void {
    this.loadCalendar();
  }

  private loadCalendar(): void {
    this.loadError.set('');
    this.analyticsService.getCalendar(this.selectedYear(), this.selectedMonth())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.calendarData.set(data),
        error: (error) => this.loadError.set(
          userFacingHttpError(error, 'Unable to load the billing calendar. Please try again.'),
        ),
      });
  }

  private buildCells(): CalendarCell[] {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = new Date();
    const eventsMap = new Map<string, CalendarDay>();

    for (const day of this.calendarData()) {
      eventsMap.set(day.date, day);
    }

    const cells: CalendarCell[] = [];

    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month - 1, -startPad + i + 1);
      cells.push(this.makeCell(d, false, eventsMap, today));
    }

    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month - 1, day);
      cells.push(this.makeCell(d, true, eventsMap, today));
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month, i);
      cells.push(this.makeCell(d, false, eventsMap, today));
    }

    return cells;
  }

  private makeCell(
    date: Date,
    inMonth: boolean,
    eventsMap: Map<string, CalendarDay>,
    today: Date,
  ): CalendarCell {
    const iso = date.toISOString().slice(0, 10);
    const dayData = eventsMap.get(iso);
    return {
      key: iso,
      day: date.getDate(),
      date: iso,
      inMonth,
      isToday: date.toDateString() === today.toDateString(),
      events: dayData?.events ?? [],
      totalAmount: dayData?.totalAmount ?? 0,
    };
  }
}

interface CalendarCell {
  key: string;
  day: number;
  date: string;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarDay['events'];
  totalAmount: number;
}
