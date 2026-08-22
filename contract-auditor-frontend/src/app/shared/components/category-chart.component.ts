import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CategoryCost } from '../../core/models/contract.models';
import { MoneyPipe } from '../pipes/money.pipe';

@Component({
  selector: 'app-category-chart',
  standalone: true,
  imports: [DecimalPipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart">
      <h3>Cost by Category</h3>
      @if (data().length === 0) {
        <p class="empty">No cost data yet. Add subscriptions to see breakdown.</p>
      } @else {
        <div class="bars">
          @for (item of data(); track trackByCategory($index, item)) {
            <div class="bar-row">
              <span class="label">{{ item.category }}</span>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="item.percentage"></div>
              </div>
              <span class="value">{{ item.amount | money:'1.0-0' }} ({{ item.percentage | number:'1.0-1' }}%)</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .chart { background: #fff; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
    h3 { margin: 0 0 1rem; color: #0f172a; }
    .empty { color: #64748b; }
    .bars { display: grid; gap: .75rem; }
    .bar-row { display: grid; grid-template-columns: 120px 1fr 140px; gap: .75rem; align-items: center; }
    .label { font-size: .875rem; color: #334155; }
    .bar-track { height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #2563eb, #7c3aed); border-radius: 999px; }
    .value { font-size: .8125rem; color: #64748b; text-align: right; }
  `],
})
export class CategoryChartComponent {
  readonly data = input.required<CategoryCost[]>();

  trackByCategory(_index: number, item: CategoryCost): string {
    return item.category;
  }
}
