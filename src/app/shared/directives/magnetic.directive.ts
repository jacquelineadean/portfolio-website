import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input } from '@angular/core';

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
      if (!supportsHover) return;

      this.zone.runOutsideAngular(() => {
        const element = this.el.nativeElement as HTMLElement;
        element.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';

        const onMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const x = (e.clientX - rect.left - rect.width / 2) * this.strength();
          const y = (e.clientY - rect.top - rect.height / 2) * this.strength();
          element.style.transform = `translate(${x}px, ${y}px)`;
        };

        const onLeave = () => {
          element.style.transform = 'translate(0, 0)';
        };

        element.addEventListener('mousemove', onMove);
        element.addEventListener('mouseleave', onLeave);

        this.cleanups.push(
          () => element.removeEventListener('mousemove', onMove),
          () => element.removeEventListener('mouseleave', onLeave)
        );
      });
    });
  }

  ngOnDestroy(): void {
    this.cleanups.forEach((fn) => fn());
  }
}
