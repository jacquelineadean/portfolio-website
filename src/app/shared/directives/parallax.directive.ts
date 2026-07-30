import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  inject,
  input,
} from '@angular/core';

/** Maximum drift, in pixels, across the full viewport traverse. */
const MAX_SHIFT_PX = 12;

@Directive({
  selector: '[appParallax]',
  standalone: true,
})
export class ParallaxDirective implements OnDestroy {
  speed = input(0.3, { alias: 'appParallax' });

  private readonly el = inject(ElementRef);
  private readonly zone = inject(NgZone);
  private rafId = 0;

  constructor() {
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      this.zone.runOutsideAngular(() => {
        const element = this.el.nativeElement as HTMLElement;

        const onScroll = () => {
          cancelAnimationFrame(this.rafId);
          this.rafId = requestAnimationFrame(() => {
            const rect = element.getBoundingClientRect();
            // Normalised -1..1 progress as the element crosses the viewport,
            // scaled by a small fixed travel so the drift stays subtle.
            const progress =
              (rect.top + rect.height / 2 - window.innerHeight / 2) / (window.innerHeight || 1);
            const clamped = Math.max(-1, Math.min(1, progress));
            const offset = clamped * MAX_SHIFT_PX * Math.min(Math.max(this.speed(), 0), 1);
            element.style.transform = `translateY(${offset.toFixed(2)}px)`;
          });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        this.cleanup = () => window.removeEventListener('scroll', onScroll);
      });
    });
  }

  private cleanup = (): void => {};

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.cleanup();
  }
}
