import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-health-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gauge-card">
      <h3>Subscription Health Score</h3>
      <div class="gauge-wrap">
        <svg viewBox="0 0 120 120" class="gauge-svg">
          <circle cx="60" cy="60" r="46" class="track" />
          <circle
            cx="60" cy="60" r="46"
            class="fill"
            [attr.stroke]="color()"
            [style.stroke-dasharray]="circumference"
            [style.stroke-dashoffset]="dashOffset()"
          />
        </svg>
        <div class="score" [style.color]="color()">{{ score() }}</div>
      </div>
      <p class="label" [style.color]="labelColor()">{{ healthLabel() }}</p>
    </div>
  `,
  styles: [`
    .gauge-card {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h3 {
      margin: 0 0 0.75rem;
      color: #0f172a;
      font-size: 0.9375rem;
      font-weight: 600;
      align-self: flex-start;
    }
    .gauge-wrap {
      position: relative;
      width: 150px;
      height: 150px;
      margin: 0.25rem auto;
    }
    .gauge-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .track { fill: none; stroke: #e8edf3; stroke-width: 12; }
    .fill {
      fill: none;
      stroke-width: 12;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.8s ease, stroke 0.3s;
    }
    .score {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.25rem;
      font-weight: 700;
      transition: color 0.3s;
    }
    .label {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      font-weight: 500;
    }
  `],
})
export class HealthGaugeComponent {
  readonly score = input.required<number>();
  readonly circumference = 2 * Math.PI * 46;

  readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(100, this.score())) / 100;
    return this.circumference * (1 - pct);
  });

  readonly color = computed(() => {
    const s = this.score();
    if (s >= 75) return '#22c55e';
    if (s >= 50) return '#f59e0b';
    return '#ef4444';
  });

  readonly labelColor = computed(() => {
    const s = this.score();
    if (s >= 75) return '#16a34a';
    if (s >= 50) return '#d97706';
    return '#dc2626';
  });

  readonly healthLabel = computed(() => {
    const s = this.score();
    if (s >= 75) return 'Healthy \u2013 subscriptions under control';
    if (s >= 50) return 'Fair \u2013 review upcoming renewals';
    return 'At risk \u2013 urgent action needed';
  });
}
