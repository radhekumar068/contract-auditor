import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MoneyPipe } from '../pipes/money.pipe';

export interface SpendSavingsPoint {
  month: number;
  year: number;
  label: string;
  spend: number;
  savings: number;
}

interface BarRect {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  series: 'spend' | 'savings';
  amount: number;
  label: string;
}

interface GridLine {
  y: number;
  label: string;
}

@Component({
  selector: 'app-spend-savings-chart',
  standalone: true,
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart">
      <h3>Monthly Spend vs. Identified Savings Opportunity</h3>
      @if (points().length === 0) {
        <p class="empty">No spend data is available for the selected date range.</p>
      } @else {
        <div class="chart-wrap">
          <svg viewBox="0 0 720 280" class="svg-chart" aria-label="Monthly spend versus savings opportunity" (mouseleave)="hovered.set(null)">
            @for (line of gridLines(); track line.label) {
              <line x1="56" [attr.y1]="line.y" x2="690" [attr.y2]="line.y" class="grid-line" />
              <text x="48" [attr.y]="line.y + 4" text-anchor="end" class="axis-label">{{ line.label }}</text>
              <text x="708" [attr.y]="line.y + 4" text-anchor="start" class="axis-label">{{ line.label }}</text>
            }
            @for (bar of bars(); track bar.key) {
              <rect
                [attr.x]="bar.x"
                [attr.y]="bar.y"
                [attr.width]="bar.width"
                [attr.height]="bar.height"
                rx="3"
                [attr.fill]="bar.color"
                class="bar"
                (mouseenter)="onBarHover($event, bar)"
              />
            }
            <polyline [attr.points]="linePoints()" fill="none" stroke="#2ec4b6" stroke-width="2.5" />
            @for (dot of lineDots(); track dot.key) {
              <circle [attr.cx]="dot.cx" [attr.cy]="dot.cy" r="4.5" fill="#2ec4b6" stroke="#fff" stroke-width="2" />
            }
            @for (point of points(); track point.label) {
              <text [attr.x]="labelX(point)" y="262" text-anchor="middle" class="month-label">{{ point.label }}</text>
            }
          </svg>
          @if (hovered(); as tip) {
            <div class="tooltip" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
              {{ tip.label }} · {{ tip.series === 'spend' ? 'Monthly Spend' : 'Savings Opportunity' }}
              {{ tip.amount | money }}
            </div>
          }
        </div>
        <div class="legend">
          <span><i class="swatch spend"></i> Monthly Spend</span>
          <span><i class="swatch savings"></i> Savings Opportunity</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .chart {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem 1.5rem 1rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
    }
    h3 { margin: 0 0 1rem; color: #0f172a; font-size: 1.05rem; font-weight: 700; }
    .empty { color: #64748b; font-size: 0.875rem; margin: 0; padding: 2rem 0; text-align: center; }
    .chart-wrap { position: relative; }
    .svg-chart { width: 100%; height: auto; display: block; }
    .grid-line { stroke: #e2e8f0; stroke-width: 1; stroke-dasharray: 5 5; }
    .axis-label { fill: #94a3b8; font-size: 11px; }
    .bar { cursor: pointer; }
    .month-label { fill: #64748b; font-size: 12px; font-weight: 500; }
    .legend {
      display: flex;
      gap: 1.25rem;
      justify-content: flex-end;
      margin-top: 0.35rem;
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .swatch {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      margin-right: 0.35rem;
      vertical-align: middle;
    }
    .swatch.spend { background: #1e3a8a; }
    .swatch.savings { background: #2ec4b6; }
    .tooltip {
      position: absolute;
      background: #1e293b;
      color: #fff;
      padding: 0.4rem 0.7rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -120%);
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `],
})
export class SpendSavingsChartComponent {
  readonly points = input.required<SpendSavingsPoint[]>();

  readonly hovered = signal<{ series: 'spend' | 'savings'; amount: number; label: string } | null>(null);
  readonly tooltipX = signal(0);
  readonly tooltipY = signal(0);

  private readonly chartLeft = 56;
  private readonly chartWidth = 634;
  private readonly chartBottom = 236;
  private readonly chartHeight = 196;
  private readonly barWidth = 16;

  readonly chartMax = computed(() => {
    const values = this.points().flatMap((point) => [point.spend, point.savings]);
    const max = Math.max(0, ...values);
    if (max <= 0) {
      return 200;
    }
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const step = magnitude / 2;
    return Math.ceil(max / step) * step;
  });

  readonly gridLines = computed((): GridLine[] => {
    const max = this.chartMax();
    const step = max / 4;
    const lines: GridLine[] = [];
    for (let i = 0; i <= 4; i++) {
      const value = step * i;
      lines.push({
        y: this.valueToY(value),
        label: this.formatAxis(value),
      });
    }
    return lines;
  });

  readonly bars = computed((): BarRect[] => {
    return this.points().flatMap((point, index) => {
      const groupX = this.groupX(index);
      const spendHeight = this.valueToHeight(point.spend);
      const savingsHeight = this.valueToHeight(point.savings);
      return [
        {
          key: `${point.year}-${point.month}-spend`,
          x: groupX,
          y: this.chartBottom - spendHeight,
          width: this.barWidth,
          height: spendHeight,
          color: '#1e3a8a',
          series: 'spend' as const,
          amount: point.spend,
          label: point.label,
        },
        {
          key: `${point.year}-${point.month}-savings`,
          x: groupX + this.barWidth + 6,
          y: this.chartBottom - savingsHeight,
          width: this.barWidth,
          height: savingsHeight,
          color: '#2ec4b6',
          series: 'savings' as const,
          amount: point.savings,
          label: point.label,
        },
      ];
    });
  });

  readonly lineDots = computed(() =>
    this.points().map((point, index) => ({
      key: `${point.year}-${point.month}-dot`,
      cx: this.groupX(index) + this.barWidth + 3,
      cy: this.valueToY(point.savings),
    })),
  );

  readonly linePoints = computed(() =>
    this.lineDots()
      .map((dot) => `${dot.cx},${dot.cy}`)
      .join(' '),
  );

  labelX(point: SpendSavingsPoint): number {
    const index = this.points().findIndex(
      (item) => item.month === point.month && item.year === point.year,
    );
    return this.groupX(index) + this.barWidth + 3;
  }

  onBarHover(event: MouseEvent, bar: BarRect): void {
    const wrap = (event.currentTarget as SVGRectElement).closest('.chart-wrap');
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      this.tooltipX.set(event.clientX - rect.left);
      this.tooltipY.set(event.clientY - rect.top);
    }
    this.hovered.set({ series: bar.series, amount: bar.amount, label: bar.label });
  }

  private groupX(index: number): number {
    const count = Math.max(this.points().length, 1);
    const groupWidth = this.chartWidth / count;
    return this.chartLeft + index * groupWidth + (groupWidth - (this.barWidth * 2 + 6)) / 2;
  }

  private valueToY(value: number): number {
    return this.chartBottom - this.valueToHeight(value);
  }

  private valueToHeight(value: number): number {
    const max = this.chartMax();
    return max > 0 ? (value / max) * this.chartHeight : 0;
  }

  private formatAxis(value: number): string {
    if (value >= 1000) {
      return `${Math.round(value / 100) / 10}k`;
    }
    return String(Math.round(value));
  }
}
