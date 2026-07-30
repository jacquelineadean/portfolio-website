import {
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  inject,
  input,
} from '@angular/core';

/** Maximum pixels the element may be pulled from rest. */
const MAX_TRAVEL_PX = 4;

@Directive({
  selector: '[appMagnetic]',
  standalone: true,
})
export class MagneticDirective implements OnDestroy {
  strength = input(0.3, { alias: 'appMagnetic' });

  private readonly el = inject(ElementRef);
  private readonly zone = inject(NgZone);
  private cleanups: (() => void)[] = [];

  constructor() {
    afterNextRender(() => {
      const supportsHover = window.matchMedia('(hover: hover)').matches;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!supportsHover || reduced) return;

      this.zone.runOutsideAngular(() => {
        const element = this.el.nativeElement as HTMLElement;
        // Labs motion budget: 200ms plain ease, no long expo settle.
        element.style.transition = 'transform 0.2s ease';

        // Strength and total travel are both capped so the pull reads as a
        // subtle nudge rather than a magnet.
        const strength = () => Math.min(Math.max(this.strength(), 0), 0.12);
        const clamp = (v: number) => Math.max(-MAX_TRAVEL_PX, Math.min(MAX_TRAVEL_PX, v));

        const onMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const x = clamp((e.clientX - rect.left - rect.width / 2) * strength());
          const y = clamp((e.clientY - rect.top - rect.height / 2) * strength());
          element.style.transform = `translate(${x}px, ${y}px)`;
        };

        const onLeave = () => {
          element.style.transform = 'translate(0, 0)';
        };

        element.addEventListener('mousemove', onMove);
        element.addEventListener('mouseleave', onLeave);

        this.cleanups.push(
          () => element.removeEventListener('mousemove', onMove),
          () => element.removeEventListener('mouseleave', onLeave),
        );
      });
    });
  }

  ngOnDestroy(): void {
    this.cleanups.forEach((fn) => fn());
  }
}
