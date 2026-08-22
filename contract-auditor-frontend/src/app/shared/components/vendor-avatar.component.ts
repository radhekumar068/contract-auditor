import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CATEGORY_COLORS } from '../../core/models/contract.models';

@Component({
  selector: 'app-vendor-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="avatar" [style.background]="color()">{{ initials() }}</span>
  `,
  styles: [`
    .avatar {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 8px;
      color: #fff; font-size: .75rem; font-weight: 700; flex-shrink: 0;
    }
  `],
})
export class VendorAvatarComponent {
  readonly name = input.required<string>();
  readonly category = input('');

  readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return this.name().slice(0, 2).toUpperCase();
  });

  readonly color = computed(() => {
    const cat = this.category();
    if (cat && CATEGORY_COLORS[cat]) {
      return CATEGORY_COLORS[cat];
    }
    const hash = this.name().split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hues = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777'];
    return hues[hash % hues.length];
  });
}
