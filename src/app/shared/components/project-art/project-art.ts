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
import { ArtVariant, artwork } from '../../art/generators';

/**
 * The generated drawing that stands in for a project.
 *
 * Decorative, so it is hidden from assistive technology: everything it says is
 * said in words by the card it sits in. It is deterministic from the seed, so a
 * project's drawing is the same on every page it appears on — the card, the
 * carousel slot and the detail banner are one picture at three sizes, not three
 * pictures.
 *
 * The drawn-on entrance is opt-in from script, never from CSS. A stylesheet
 * that hid the strokes by default would hide them for good in prerendered
 * output and wherever the observer never runs; instead the resting state is the
 * finished drawing, and JS is what winds it back to the start.
 */
@Component({
  selector: 'app-project-art',
  standalone: true,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      preserveAspectRatio="xMidYMid slice"
      [class.is-drawing]="drawing()"
      aria-hidden="true"
      focusable="false"
    >
      @for (layer of layers(); track layer.key) {
        <path [attr.d]="layer.d" [class]="layer.key" [attr.pathLength]="layer.fill ? null : 1" />
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
      height: 100%;
    }

    path {
      fill: none;
      stroke: currentColor;
      stroke-width: 1;
      stroke-linecap: round;
      stroke-linejoin: round;
      /* The drawing is scaled by preserveAspectRatio, and a scaled hairline goes
         from a hairline on the detail banner to a smear on a card. */
      vector-effect: non-scaling-stroke;
    }

    .faint {
      opacity: 0.34;
    }

    .ink {
      opacity: 0.72;
    }

    .accent {
      color: var(--art-accent, var(--color-blue));
      stroke-width: 1.6;
    }

    .is-filled {
      fill: currentColor;
      stroke: none;
    }

    /* pathLength normalises the whole layer to 1, and a dash pattern runs
       continuously across a path's subpaths — so one animation walks the dash
       through several hundred strikes in the order the generator emitted them.
       The sieve appears to run rather than to fade in, and it costs one node. */
    .is-drawing path:not(.is-filled) {
      stroke-dasharray: 1;
      animation: draw 1.6s var(--ease-out-quart) backwards;
    }

    .is-drawing .accent:not(.is-filled) {
      animation-duration: 1.1s;
      animation-delay: 1.1s;
    }

    .is-drawing .is-filled {
      animation: appear 700ms var(--ease-out-quart) backwards;
    }

    .is-drawing .accent.is-filled {
      animation-delay: 0.5s;
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
      .is-drawing path {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectArt {
  variant = input<ArtVariant>('graph');
  /** Anything stable and unique — the project slug is what callers pass. */
  seed = input('');
  width = input(400);
  height = input(150);

  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly drawing = signal(false);

  /**
   * One path element per (tone, fill) pair rather than per shape.
   *
   * A footprint field is well over a thousand rectangles, and a thousand <path>
   * nodes is a real cost in a page that also has to lay out and paint the rest
   * of itself — while the rendered result is identical, because every shape in a
   * layer is drawn with the same paint. Concatenating their `d` strings into one
   * multi-subpath path collapses the node count to four and keeps the drawing
   * pixel for pixel the same.
   */
  protected readonly layers = computed<Layer[]>(() => {
    const shapes = artwork(this.variant(), this.seed(), this.width(), this.height()).shapes;
    const byKey = new Map<string, Layer>();
    const order: Layer[] = [];

    for (const shape of shapes) {
      const key = shape.fill ? `${shape.tone} is-filled` : shape.tone;
      let layer = byKey.get(key);
      if (!layer) {
        layer = { key, d: '', fill: !!shape.fill };
        byKey.set(key, layer);
        order.push(layer);
      }
      layer.d += shape.d;
    }
    return order;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const element = this.host.nativeElement as HTMLElement;
      if (!('IntersectionObserver' in window)) return;

      // Drawing on while the card is still below the fold spends the animation
      // where nobody is looking, and leaves a static picture when they arrive.
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          this.drawing.set(true);
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

interface Layer {
  /** Doubles as the element's class list. */
  key: string;
  d: string;
  fill: boolean;
}
