import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CategoryCost, CATEGORY_COLORS } from '../../core/models/contract.models';
import { MoneyPipe } from '../pipes/money.pipe';

interface DonutSegment {
  category: string;
  color: string;
  dashArray: string;
  dashOffset: number;
  amount: number;
  percentage: number;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [DecimalPipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="donut-card">
      <h3>Cost Breakdown by Category</h3>
      @if (data().length === 0) {
        <p class="empty">No cost data yet.</p>
      } @else {
        <div class="donut-layout">
          <div class="donut-wrap">
            <svg viewBox="0 0 100 100" class="donut" (mouseleave)="hovered.set(null)">
              @for (segment of segments(); track segment.category) {
                <circle
                  cx="50" cy="50" r="38"
                  fill="none"
                  [attr.stroke]="segment.color"
                  stroke-width="18"
                  [attr.stroke-dasharray]="segment.dashArray"
                  [attr.stroke-dashoffset]="segment.dashOffset"
                  transform="rotate(-90 50 50)"
                  class="segment"
                  [class.hovered]="hovered() === segment.category"
                  (mouseenter)="onSegmentHover(segment)"
                />
              }
            </svg>
            @if (hoveredSegment(); as seg) {
              <div class="tooltip">{{ seg.category }} {{ seg.amount | money:'1.0-0' }} ({{ seg.percentage | number:'1.0-0' }}%)</div>
            }
          </div>
          <ul class="legend">
            @for (item of data(); track item.category) {
              <li
                [class.active]="hovered() === item.category"
                (mouseenter)="hovered.set(item.category)"
                (mouseleave)="hovered.set(null)"
              >
                <span class="dot" [style.background]="colorFor(item.category)"></span>
                <span class="name">{{ item.category }}</span>
                <span class="amt">{{ item.amount | money:'1.0-0' }} ({{ item.percentage | number:'1.0-0' }}%)</span>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .donut-card {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
      height: 100%;
    }
    h3 { margin: 0 0 1.25rem; color: #0f172a; font-size: 0.9375rem; font-weight: 600; }
    .empty { color: #64748b; font-size: 0.875rem; }
    .donut-layout {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 1.5rem;
      align-items: center;
    }
    .donut-wrap { position: relative; width: 180px; height: 180px; flex-shrink: 0; }
    .donut { width: 100%; height: 100%; }
    .segment {
      cursor: pointer;
      transition: opacity 0.15s, filter 0.15s;
      opacity: 0.92;
    }
    .segment.hovered { opacity: 1; filter: brightness(1.08); }
    .tooltip {
      position: absolute;
      top: 35%;
      left: 55%;
      background: #1e293b;
      color: #fff;
      padding: 0.4rem 0.7rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 1.25rem;
      align-content: start;
    }
    li {
      display: grid;
      grid-template-columns: 10px 1fr;
      gap: 0.45rem;
      align-items: start;
      font-size: 0.8125rem;
      cursor: pointer;
      padding: 0.25rem 0.4rem;
      border-radius: 6px;
      transition: background 0.15s;
    }
    li:hover, li.active { background: #f1f5f9; }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 0.25rem;
    }
    .name { color: #334155; grid-column: 2; font-weight: 500; }
    .amt {
      color: #64748b;
      font-size: 0.75rem;
      grid-column: 2;
      white-space: nowrap;
    }
    @media (max-width: 640px) {
      .donut-layout { grid-template-columns: 1fr; justify-items: center; }
      .legend { grid-template-columns: 1fr; width: 100%; }
    }
  `],
})
export class DonutChartComponent {
  readonly data = input.required<CategoryCost[]>();
  readonly hovered = signal<string | null>(null);

  readonly segments = computed((): DonutSegment[] => {
    const circumference = 2 * Math.PI * 38;
    let offset = 0;
    return this.data().map((item) => {
      const length = (item.percentage / 100) * circumference;
      const segment: DonutSegment = {
        category: item.category,
        color: this.colorFor(item.category),
        dashArray: `${length} ${circumference}`,
        dashOffset: -offset,
        amount: item.amount,
        percentage: item.percentage,
      };
      offset += length;
      return segment;
    });
  });

  readonly hoveredSegment = computed(() => {
    const category = this.hovered();
    if (!category) return null;
    return this.segments().find((s) => s.category === category) ?? null;
  });

  onSegmentHover(segment: DonutSegment): void {
    this.hovered.set(segment.category);
  }

  colorFor(category: string): string {
    return CATEGORY_COLORS[category] ?? CATEGORY_COLORS['default'];
  }
}
