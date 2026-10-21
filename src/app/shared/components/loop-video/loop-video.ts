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
  viewChild,
} from '@angular/core';

/**
 * A short, silent recording that loops while it is on screen.
 *
 * `src` names a pair of files, `<src>.webm` (VP9) and `<src>.mp4` (H.264):
 * Chromium builds without H.264 play the first, Safari before VP9 the second.
 *
 * The file downloads only when the plate nears the viewport, plays while a
 * third of it is in view and pauses otherwise. Under reduced motion it never
 * starts by itself: the poster shows and the native controls play it.
 */
@Component({
  selector: 'app-loop-video',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lv-plate" [class.is-dark]="dark()">
      <video
        #video
        [attr.aria-label]="label()"
        [poster]="poster()"
        [controls]="reducedMotion"
        [style.aspect-ratio]="ratio()"
        preload="none"
        muted
        loop
        playsinline
        disablepictureinpicture
      ></video>
      @if (!reducedMotion) {
        <button
          type="button"
          class="lv-toggle"
          (click)="paused.set(!paused())"
          [attr.aria-pressed]="paused()"
          [attr.aria-label]="paused() ? 'Play recording' : 'Pause recording'"
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

    .lv-plate {
      position: relative;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;

      &.is-dark {
        background: #1d1f24;
      }
    }

    video {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
    }

    .lv-toggle {
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
      transition: opacity var(--duration-fast) ease;
    }

    .lv-plate:hover .lv-toggle,
    .lv-toggle:focus-visible,
    .lv-toggle[aria-pressed='true'] {
      opacity: 1;
    }

    @media (hover: none) {
      .lv-toggle {
        opacity: 1;
      }
    }
  `,
})
export class LoopVideo {
  /** Path to the pair without the extension, relative to the base href. */
  readonly src = input.required<string>();
  readonly poster = input.required<string>();
  readonly label = input.required<string>();
  /** Width over height, held before the poster loads so the page does not jump. */
  readonly ratio = input('16 / 9');
  /** For recordings of a dark screen, so the plate's edge matches them. */
  readonly dark = input(false);

  protected readonly paused = signal(false);
  protected readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly visible = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const video = this.video().nativeElement;
      const near = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.load(video);
            near.disconnect();
          }
        },
        { rootMargin: '400px 0px' },
      );
      const inView = new IntersectionObserver(([entry]) => this.visible.set(entry.isIntersecting), {
        threshold: 0.33,
      });
      near.observe(this.host.nativeElement);
      inView.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => {
        near.disconnect();
        inView.disconnect();
      });
    });

    effect(() => {
      const video = this.video().nativeElement;
      if (this.reducedMotion) return;
      if (this.visible() && !this.paused()) {
        this.load(video);
        // Autoplay can be refused (data saver, a background tab); the poster stays.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }

  private load(video: HTMLVideoElement): void {
    if (video.getAttribute('src')) return;
    // The muted attribute in a template is set after the element exists, which
    // leaves the muted property false, and browsers refuse to autoplay sound.
    video.muted = true;
    const webm = video.canPlayType('video/webm; codecs="vp9"') !== '';
    video.src = `${this.src()}.${webm ? 'webm' : 'mp4'}`;
  }
}
