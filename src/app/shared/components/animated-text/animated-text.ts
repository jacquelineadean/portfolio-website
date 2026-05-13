import { Component, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { ScrollAnimationService } from '../../../core/services/scroll-animation.service';

@Component({
  selector: 'app-animated-text',
  standalone: true,
  template: '<span style="visibility: hidden"><ng-content /></span>',
  styles: ':host { display: inline-block; }',
})
export class AnimatedText {
  delay = input(0);

  private readonly el = inject(ElementRef);
  private readonly scrollService = inject(ScrollAnimationService);

  constructor() {
    afterNextRender(() => {
      const span = this.el.nativeElement.querySelector('span');
      if (span) {
        this.scrollService.animateText(span, this.delay());
      }
    });
  }
}
