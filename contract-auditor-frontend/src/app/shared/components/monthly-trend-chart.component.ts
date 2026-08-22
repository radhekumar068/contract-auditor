import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CategoryCost, MonthlyCost, CATEGORY_COLORS } from '../../core/models/contract.models';
import { MoneyPipe } from '../pipes/money.pipe';

interface BarGroup {
  month: number;
  label: string;
  bars: BarItem[];
}

interface BarItem {
  category: string;
  color: string;
  amount: number;
  x: number;
  y: number;
  height: number;
}

interface GridLine {
  y: number;
  label: string;
}

@Component({
  selector: 'app-monthly-trend-chart',
  standalone: true,
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart">
      <h3>Monthly Spend Trend</h3>
      @if (displayMonths().length === 0) {
        <p class="empty">No monthly trend data available.</p>
      } @else {
        <div class="chart-wrap">
          <svg viewBox="0 0 600 240" class="svg-chart" aria-label="Monthly spend trend chart" (mouseleave)="hovered.set(null)">
            @for (line of gridLines(); track line.label) {
              <line x1="40" [attr.y1]="line.y" x2="580" [attr.y2]="line.y" class="grid-line" />
              <text x="32" [attr.y]="line.y + 4" text-anchor="end" class="axis-label">{{ line.label }}</text>
            }
            @for (group of barGroups(); track group.month) {
              @for (bar of group.bars; track bar.category) {
                <rect
                  [attr.x]="bar.x"
                  [attr.y]="bar.y"
                  [attr.width]="barWidth"
                  [attr.height]="bar.height"
                  rx="4"
                  [attr.fill]="bar.color"
                  class="bar"
                  [class.hovered]="isHovered(group.month, bar.category)"
                  (mouseenter)="onBarHover($event, group, bar)"
                />
                @if (bar.height > 12) {
                  <text
                    [attr.x]="bar.x + barWidth / 2"
                    [attr.y]="bar.y - 6"
                    text-anchor="middle"
                    class="amount"
                  >{{ bar.amount | money:'1.0-0' }}</text>
                }
              }
              <text
                [attr.x]="groupCenterX(group)"
                y="228"
                text-anchor="middle"
                class="month-label"
              >{{ group.label }}</text>
            }
          </svg>
          @if (hovered(); as tip) {
            <div class="tooltip" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
              {{ tip.category }} {{ tip.amount | money }}
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .chart {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
      height: 100%;
    }
    h3 { margin: 0 0 1.25rem; color: #0f172a; font-size: 0.9375rem; font-weight: 600; }
    .empty { color: #64748b; font-size: 0.875rem; }
    .chart-wrap { position: relative; }
    .svg-chart { width: 100%; height: auto; display: block; }
    .grid-line { stroke: #e2e8f0; stroke-width: 1; stroke-dasharray: 4 4; }
    .axis-label { fill: #94a3b8; font-size: 10px; }
    .bar { cursor: pointer; transition: opacity 0.15s, filter 0.15s; }
    .bar.hovered { opacity: 0.85; filter: brightness(1.1); }
    .month-label { fill: #64748b; font-size: 11px; font-weight: 500; }
    .amount { fill: #334155; font-size: 9px; font-weight: 600; }
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
export class MonthlyTrendChartComponent {
  readonly data = input.required<MonthlyCost[]>();
  readonly categories = input<CategoryCost[]>([]);

  readonly barWidth = 16;
  readonly hovered = signal<{ month: number; category: string; amount: number; label: string } | null>(null);
  readonly tooltipX = signal(0);
  readonly tooltipY = signal(0);

  readonly displayMonths = computed(() => {
    const items = [...this.data()].sort((a, b) => a.month - b.month);
    if (items.length === 0) return [];
    if (items.length >= 4) return items.slice(-4);
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const padded: MonthlyCost[] = [];
    const lastMonth = items[items.length - 1].month;
    for (let i = 3; i >= 0; i--) {
      const monthNum = lastMonth - i;
      if (monthNum < 1) continue;
      const existing = items.find((m) => m.month === monthNum);
      padded.push(existing ?? {
        month: monthNum,
        monthLabel: monthLabels[monthNum - 1] ?? `M${monthNum}`,
        amount: 0,
      });
    }
    return padded.length > 0 ? padded : items;
  });

  private readonly topCategories = computed(() => {
    const cats = this.categories();
    if (cats.length === 0) {
      return [
        { category: 'Entertainment', amount: 0, percentage: 34 },
        { category: 'Software', amount: 0, percentage: 33 },
        { category: 'Utilities', amount: 0, percentage: 33 },
      ];
    }
    return [...cats].sort((a, b) => b.amount - a.amount).slice(0, 3);
  });

  private readonly chartMax = computed(() => {
    const items = this.displayMonths();
    const cats = this.topCategories();
    let maxBar = 0;
    for (const item of items) {
      for (const cat of cats) {
        const amount = this.distributeAmount(item.amount, cat.percentage);
        maxBar = Math.max(maxBar, amount);
      }
    }
    return Math.max(20, Math.ceil(maxBar / 5) * 5);
  });

  readonly gridLines = computed((): GridLine[] => {
    const max = this.chartMax();
    const step = max <= 20 ? 5 : Math.ceil(max / 4 / 5) * 5;
    const lines: GridLine[] = [];
    for (let v = 0; v <= max; v += step) {
      lines.push({ y: this.valueToY(v), label: String(v) });
    }
    return lines;
  });

  readonly barGroups = computed((): BarGroup[] => {
    const items = this.displayMonths();
    if (items.length === 0) return [];

    const topCategories = this.topCategories();
    const max = this.chartMax();
    const chartHeight = 160;
    const chartBottom = 200;
    const groupWidth = 540 / items.length;
    const groupBarWidth = topCategories.length * this.barWidth + (topCategories.length - 1) * 5;

    return items.map((item, index) => {
      const groupX = 40 + index * groupWidth + (groupWidth - groupBarWidth) / 2;
      const bars: BarItem[] = topCategories.map((cat, catIndex) => {
        const amount = this.distributeAmount(item.amount, cat.percentage);
        const height = max > 0 ? (amount / max) * chartHeight : 0;
        return {
          category: cat.category,
          color: this.colorFor(cat.category),
          amount,
          x: groupX + catIndex * (this.barWidth + 5),
          y: chartBottom - height,
          height,
        };
      });
      return { month: item.month, label: item.monthLabel, bars };
    });
  });

  onBarHover(event: MouseEvent, group: BarGroup, bar: BarItem): void {
    const wrap = (event.currentTarget as SVGRectElement).closest('.chart-wrap');
    if (wrap) {
      const rect = wrap.getBoundingClientRect();
      this.tooltipX.set(event.clientX - rect.left);
      this.tooltipY.set(event.clientY - rect.top);
    }
    this.hovered.set({ month: group.month, category: bar.category, amount: bar.amount, label: group.label });
  }

  groupCenterX(group: BarGroup): number {
    if (group.bars.length === 0) return 0;
    const first = group.bars[0].x;
    const last = group.bars[group.bars.length - 1];
    return first + (last.x + this.barWidth - first) / 2;
  }

  isHovered(month: number, category: string): boolean {
    const h = this.hovered();
    return h !== null && h.month === month && h.category === category;
  }

  private valueToY(value: number): number {
    const max = this.chartMax();
    const chartHeight = 160;
    const chartBottom = 200;
    return chartBottom - (value / max) * chartHeight;
  }

  private distributeAmount(total: number, percentage: number): number {
    return Math.round((total * percentage) / 100 * 100) / 100;
  }

  colorFor(category: string): string {
    return CATEGORY_COLORS[category] ?? CATEGORY_COLORS['default'];
  }
}
