import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input } from '@angular/core';

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
      this.zone.runOutsideAngular(() => {
        const onScroll = () => {
          this.rafId = requestAnimationFrame(() => {
            const rect = this.el.nativeElement.getBoundingClientRect();
            const offset = (window.innerHeight - rect.top) * this.speed();
            this.el.nativeElement.style.transform = `translateY(${offset}px)`;
          });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
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
