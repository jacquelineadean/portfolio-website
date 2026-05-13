import { Component, input } from '@angular/core';

@Component({
  selector: 'app-tag',
  standalone: true,
  template: '<span class="tag">{{ label() }}</span>',
  styles: `
    .tag {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--color-accent-secondary);
      background: var(--color-accent-glow);
      border-radius: var(--radius-xl);
      letter-spacing: var(--tracking-wide);
    }
  `,
})
export class Tag {
  label = input.required<string>();
}
