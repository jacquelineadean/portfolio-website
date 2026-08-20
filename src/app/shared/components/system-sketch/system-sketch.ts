import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { systemSketch } from '../../art/system-sketch';

/**
 * The drawn architecture diagram.
 *
 * It says something, so it is exposed as an image with a description rather
 * than hidden the way the abstract marks are. The strokes draw themselves in
 * when the diagram reaches the viewport, in the order a person would draw them
 * — boxes first, then the connectors, then the notes in the margin.
 */
@Component({
  selector: 'app-system-sketch',
  standalone: true,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + sketch().width + ' ' + sketch().height"
      [attr.aria-label]="sketch().description"
      [class.is-drawing]="drawing()"
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      @for (stroke of sketch().strokes; track $index; let i = $index) {
        <path [attr.d]="stroke" pathLength="1" [style.animation-delay.ms]="i * 55" />
      }
      @for (label of sketch().labels; track label.text; let i = $index) {
        <text
          [attr.x]="label.x"
          [attr.y]="label.y"
          [attr.text-anchor]="label.anchor ?? 'middle'"
          [class.aside]="label.aside"
          [style.animation-delay.ms]="900 + i * 90"
        >
          {{ label.text }}
        </text>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      color: var(--color-ink);
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
    }

    path {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
    }

    text {
      font-family: var(--font-mono);
      font-size: 15px;
      fill: currentColor;
    }

    /* The two marginal notes are the aside voice: smaller and lighter, and hung
       off an edge by their own anchor rather than centred on a point. */
    .aside {
      font-size: 12px;
      fill: var(--color-ink-muted);
    }

    .is-drawing path {
      stroke-dasharray: 1;
      animation: draw 620ms var(--ease-out-quart) backwards;
    }

    .is-drawing text {
      animation: appear 400ms var(--ease-out-quart) backwards;
    }

    @keyframes draw {
      from {
        stroke-dashoffset: 1;
      }
    }

    @keyframes appear {
      from {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .is-drawing path,
      .is-drawing text {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemSketch {
  seed = input('strangler');

  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly drawing = signal(false);
  protected readonly sketch = computed(() => systemSketch(this.seed()));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          this.drawing.set(true);
        },
        { rootMargin: '0px 0px -15% 0px' },
      );
      observer.observe(this.host.nativeElement as HTMLElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
