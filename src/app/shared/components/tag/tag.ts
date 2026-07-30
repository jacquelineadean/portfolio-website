import { Component, input } from '@angular/core';

@Component({
  selector: 'app-tag',
  standalone: true,
  template: '<span class="tag">{{ label() }}</span>',
  styles: `
    .tag {
      display: inline-block;
      padding: 0.4rem 1rem;
      font-family: var(--font-body);
      font-size: var(--text-xs);
      font-weight: 500;
      letter-spacing: var(--tracking-normal);
      color: var(--color-on-surface-subtle);
      background: var(--color-accent-soft);
      border: 1px solid var(--color-hairline);
      border-radius: var(--radius-pill);
      white-space: nowrap;
    }

    :host-context(.section--inverse) .tag {
      color: var(--color-on-surface-inverse);
      background: transparent;
      border-color: var(--color-outline-dark);
    }
  `,
})
export class Tag {
  label = input.required<string>();
}
