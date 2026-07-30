import { Component, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { RevealAnimation } from '../../../core/services/scroll-animation.service';

/**
 * Crisp, Labs-style reveal: 120-200ms ease, a few pixels of travel, no
 * cinematic choreography. Inputs are unchanged (values still expressed in
 * seconds) but are clamped to the restrained motion budget.
 */
@Component({
  selector: 'app-scroll-reveal',
  standalone: true,
  template: '<ng-content />',
  styles: `
    :host {
      display: block;
    }

    /*
     * Armed only once JS is running, so no-JS / prerendered content stays
     * visible. ::ng-deep is required because the staggered children are
     * projected content and carry the parent component's scope attribute.
     */
    :host(.reveal-armed.reveal-single),
    :host(.reveal-armed) ::ng-deep .reveal-item {
      opacity: 0;
      transform: var(--reveal-from, translateY(8px));
    }

    /* Transition lives on the target state so arming itself is instant. */
    :host(.reveal-in.reveal-single),
    :host(.reveal-in) ::ng-deep .reveal-item {
      opacity: 1;
      transform: none;
      transition:
        opacity var(--reveal-duration, 200ms) ease,
        transform var(--reveal-duration, 200ms) ease;
      transition-delay: var(--reveal-delay, 0ms);
    }

    @media (prefers-reduced-motion: reduce) {
      :host(.reveal-armed.reveal-single),
      :host(.reveal-armed) ::ng-deep .reveal-item {
        opacity: 1;
        transform: none;
        transition: none;
      }
    }
  `,
})
export class ScrollReveal {
  animation = input<RevealAnimation>('fade-up');
  /** Seconds, matching the previous API. Clamped to 300ms. */
  delay = input(0);
  /** Seconds between children. Clamped to 60ms. */
  stagger = input(0);
  /** Seconds. Clamped to the 120-200ms Labs motion budget. */
  duration = input(0.8);

  private readonly el: ElementRef<HTMLElement> = inject(ElementRef);

  constructor() {
    afterNextRender(() => this.arm());
  }

  private arm(): void {
    const host = this.el.nativeElement as HTMLElement;

    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    const durationMs = Math.round(Math.min(Math.max(this.duration(), 0.12), 0.2) * 1000);
    const delayMs = Math.round(Math.min(Math.max(this.delay(), 0), 0.3) * 1000);
    const staggerMs = Math.round(Math.min(Math.max(this.stagger(), 0), 0.06) * 1000);

    host.style.setProperty('--reveal-duration', `${durationMs}ms`);
    host.style.setProperty('--reveal-delay', `${delayMs}ms`);
    host.style.setProperty('--reveal-from', this.travel());

    const children = Array.from(host.children) as HTMLElement[];
    const staggered = staggerMs > 0 && children.length > 1;

    if (staggered) {
      children.forEach((child, i) => {
        child.classList.add('reveal-item');
        child.style.setProperty('--reveal-delay', `${delayMs + i * staggerMs}ms`);
      });
    } else {
      host.classList.add('reveal-single');
    }

    host.classList.add('reveal-armed');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          host.classList.add('reveal-in');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(host);
  }

  private travel(): string {
    switch (this.animation()) {
      case 'slide-left':
        return 'translateX(-12px)';
      case 'slide-right':
        return 'translateX(12px)';
      case 'fade-in':
        return 'none';
      default:
        return 'translateY(8px)';
    }
  }
}
