import { Component, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { ScrollAnimationService, RevealAnimation } from '../../../core/services/scroll-animation.service';

@Component({
  selector: 'app-scroll-reveal',
  standalone: true,
  template: '<ng-content />',
  styles: ':host { display: block; }',
})
export class ScrollReveal {
  animation = input<RevealAnimation>('fade-up');
  delay = input(0);
  stagger = input(0);
  duration = input(0.8);

  private readonly el = inject(ElementRef);
  private readonly scrollService = inject(ScrollAnimationService);

  constructor() {
    afterNextRender(() => {
      this.scrollService.revealElement(this.el.nativeElement, {
        animation: this.animation(),
        delay: this.delay(),
        stagger: this.stagger(),
        duration: this.duration(),
      });
    });
  }
}
