import { Component, input } from '@angular/core';

@Component({
  selector: 'app-tag',
  standalone: true,
  template: '<span class="tag">{{ label() }}</span>',
  styles: `
    .tag {
      display: inline-block;
      padding: 0.28rem 0.8rem;
      font-family: var(--font-mono);
      font-size: var(--text-2xs);
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-pill);
      white-space: nowrap;
    }
  `,
})
export class Tag {
  label = input.required<string>();
}
