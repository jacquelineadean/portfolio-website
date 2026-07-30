import { Component, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Short fade-in for a run of text. The old per-character cinematic stagger is
 * gone — Labs motion is a single 200ms ease with a couple of pixels of travel.
 * The public API ([delay], in seconds) is unchanged.
 */
@Component({
  selector: 'app-animated-text',
  standalone: true,
  template: '<span class="animated-text"><ng-content /></span>',
  styles: `
    :host {
      display: inline-block;
    }

    .animated-text.is-armed {
      opacity: 0;
      transform: translateY(6px);
    }

    .animated-text.is-in {
      opacity: 1;
      transform: none;
      transition:
        opacity var(--duration-normal, 200ms) ease,
        transform var(--duration-normal, 200ms) ease;
      transition-delay: var(--text-reveal-delay, 0ms);
    }

    @media (prefers-reduced-motion: reduce) {
      .animated-text.is-armed {
        opacity: 1;
        transform: none;
        transition: none;
      }
    }
  `,
})
export class AnimatedText {
  /** Seconds, matching the previous API. Clamped to 300ms. */
  delay = input(0);

  private readonly el: ElementRef<HTMLElement> = inject(ElementRef);

  constructor() {
    afterNextRender(() => {
      const span = this.el.nativeElement.querySelector<HTMLElement>('.animated-text');
      if (!span) return;

      const reduced =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      const delayMs = Math.round(Math.min(Math.max(this.delay(), 0), 0.3) * 1000);
      span.style.setProperty('--text-reveal-delay', `${delayMs}ms`);
      span.classList.add('is-armed');

      requestAnimationFrame(() => span.classList.add('is-in'));
    });
  }
}
