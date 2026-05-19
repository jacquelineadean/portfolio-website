import { Injectable, NgZone, inject } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export type RevealAnimation = 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right';

export interface RevealOptions {
  animation?: RevealAnimation;
  delay?: number;
  duration?: number;
  stagger?: number;
}

@Injectable({ providedIn: 'root' })
export class ScrollAnimationService {
  private readonly zone = inject(NgZone);
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    gsap.registerPlugin(ScrollTrigger);
    this.initialized = true;
  }

  revealElement(element: HTMLElement, options: RevealOptions = {}): void {
    this.init();

    const { animation = 'fade-up', delay = 0, duration = 0.8, stagger = 0 } = options;

    this.zone.runOutsideAngular(() => {
      const from: gsap.TweenVars = { opacity: 0 };

      switch (animation) {
        case 'fade-up':
          from['y'] = 60;
          break;
        case 'slide-left':
          from['x'] = -80;
          break;
        case 'slide-right':
          from['x'] = 80;
          break;
      }

      const target =
        stagger > 0 && element.children.length > 1 ? Array.from(element.children) : element;

      gsap.from(target, {
        ...from,
        duration,
        delay,
        stagger: stagger > 0 ? stagger : undefined,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    });
  }

  animateText(element: HTMLElement, delay = 0): void {
    this.init();

    this.zone.runOutsideAngular(() => {
      const text = element.textContent || '';
      element.textContent = '';
      element.style.visibility = 'visible';

      const chars = text.split('').map((char) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? ' ' : char;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        element.appendChild(span);
        return span;
      });

      gsap.to(chars, {
        opacity: 1,
        y: 0,
        duration: 0.05,
        stagger: 0.03,
        delay,
        ease: 'power2.out',
        onStart: () => {
          gsap.set(chars, { y: 20 });
        },
      });
    });
  }
}
