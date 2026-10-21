import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

type Variant = 'wide' | 'tall';

/** Below this width the tall layout is used; its labels stay readable at phone width. */
const PHONE = '(max-width: 700px)';

/**
 * Sizes the figure's outer SVG only: the drawing nested inside it is placed by
 * its own width and height attributes. Pausing every keyframe track freezes
 * the timeline in place, since the SVG plays on one CSS clock.
 */
const SHADOW_STYLE = `
  :host { display: block; }
  :host > svg { display: block; width: 100%; height: 100%; }
  :host(.is-paused) svg, :host(.is-paused) svg * { animation-play-state: paused !important; }
`;

/**
 * A chronicle animation: one self-contained SVG whose motion is CSS keyframes,
 * built by scripts/figures/build.mjs from the chronicle plugin.
 *
 * `src` names a pair of files, `<src>-wide.svg` and `<src>-tall.svg`. The SVG
 * goes into a shadow root because its stylesheet is written for a page of its
 * own: inline in the document, its rules for generic classes would reach the
 * site. Fonts still resolve, since @font-face rules in the document apply
 * inside shadow trees.
 *
 * The figure is inserted when it scrolls into view, so it starts on its first
 * step where the reader is looking, and pauses while it is off screen.
 */
@Component({
  selector: 'app-chronicle-figure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cf-plate" [class.is-loaded]="loaded()">
      <div #stage class="cf-stage"></div>
      @if (loaded() && !reducedMotion) {
        <button
          type="button"
          class="cf-toggle"
          (click)="paused.set(!paused())"
          [attr.aria-pressed]="paused()"
          [attr.aria-label]="paused() ? 'Play animation' : 'Pause animation'"
        >
          <span aria-hidden="true">{{ paused() ? '▶' : '❚❚' }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .cf-plate {
      position: relative;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    /* Space held for the drawing before it loads, close to each layout's
       proportions so the page does not jump when it arrives. */
    .cf-stage {
      aspect-ratio: 2 / 1;
    }

    .cf-toggle {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      font-size: 0.7rem;
      letter-spacing: -0.1em;
      color: var(--color-ink-soft);
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 50%;
      opacity: 0;
      transition:
        opacity var(--duration-fast) ease,
        color var(--duration-fast) ease,
        border-color var(--duration-fast) ease;
    }

    .cf-plate:hover .cf-toggle,
    .cf-toggle:focus-visible,
    .cf-toggle[aria-pressed='true'] {
      opacity: 1;
    }

    .cf-toggle:hover {
      color: var(--color-ink);
      border-color: var(--color-border-hover);
    }

    /* Edge to edge on a phone: the figure's labels gain the width of the
       page gutters. */
    @media (max-width: 700px) {
      .cf-plate {
        margin-inline: calc(-1 * var(--container-padding));
        border-inline: none;
        border-radius: 0;
      }

      .cf-stage {
        aspect-ratio: 3 / 5;
      }

      .cf-toggle {
        opacity: 1;
      }
    }
  `,
})
export class ChronicleFigure {
  /** Path to the pair without the variant and extension, relative to the base href. */
  readonly src = input.required<string>();

  protected readonly loaded = signal(false);
  protected readonly paused = signal(false);
  protected readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly visible = signal(false);
  private readonly variant = signal<Variant>('wide');
  private shadow: ShadowRoot | null = null;
  /** The last request; a response for any other is stale and dropped. */
  private request = 0;
  private readonly cache = new Map<string, Promise<string>>();

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.shadow = this.stage()!.nativeElement.attachShadow({ mode: 'open' });
      const phone = matchMedia(PHONE);
      this.variant.set(phone.matches ? 'tall' : 'wide');
      const onPhone = (e: MediaQueryListEvent) => this.variant.set(e.matches ? 'tall' : 'wide');
      phone.addEventListener('change', onPhone);

      // Fetch ahead of the reader; insert once a fifth of the plate is in view.
      const near = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) this.fetch(this.url());
        },
        { rootMargin: '600px 0px' },
      );
      const inView = new IntersectionObserver(([entry]) => this.visible.set(entry.isIntersecting), {
        threshold: 0.2,
      });
      near.observe(this.host.nativeElement);
      inView.observe(this.host.nativeElement);

      destroyRef.onDestroy(() => {
        phone.removeEventListener('change', onPhone);
        near.disconnect();
        inView.disconnect();
      });
    });

    // Insert on first sight, and again whenever the file changes: another
    // project's figure when the router reuses this page, or the other layout
    // when the viewport crosses the phone width.
    effect(() => {
      const url = this.url();
      const stage = this.stage()?.nativeElement;
      if (!stage || !this.visible()) return;
      untracked(() => {
        if (stage.dataset['src'] !== url) this.insert(stage, url);
      });
    });

    effect(() => {
      const paused = this.paused() || !this.visible();
      this.stage()?.nativeElement.classList.toggle('is-paused', paused);
    });
  }

  private url(): string {
    return `${this.src()}-${this.variant()}.svg`;
  }

  private fetch(url: string): Promise<string> {
    let text = this.cache.get(url);
    if (!text) {
      text = fetch(url).then((r) =>
        r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${url}`)),
      );
      this.cache.set(url, text);
    }
    return text;
  }

  private async insert(stage: HTMLElement, url: string): Promise<void> {
    const id = ++this.request;
    stage.dataset['src'] = url;
    let text: string;
    try {
      text = await this.fetch(url);
    } catch {
      this.cache.delete(url);
      delete stage.dataset['src'];
      return;
    }
    if (id !== this.request || !this.shadow) return;

    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg.nodeName !== 'svg') return;
    const [, , w, h] = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    if (w && h) stage.style.aspectRatio = `${w} / ${h}`;

    const style = document.createElement('style');
    style.textContent = SHADOW_STYLE;
    this.shadow.replaceChildren(style, document.importNode(svg, true));
    this.loaded.set(true);
  }
}
