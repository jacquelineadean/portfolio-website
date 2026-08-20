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
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Project } from '../../../core/models/project.model';

/**
 * Wheel carousel.
 *
 * The slides are not on a translating rail — they ride the rim of a very large
 * circle, so advancing rotates the whole wheel and the neighboring cards tilt
 * away from the centre instead of merely sliding. The geometry lives in the
 * stylesheet; this class owns only the position along the wheel.
 *
 * `position` is measured in slides and is fractional while dragging, which is
 * what lets the wheel track the pointer continuously and then settle on a whole
 * slide when the drag ends. The settle itself is a CSS transition on the wheel's
 * transform: the rotation angle is derived from `--position`, so writing a new
 * value is enough to animate it, and suppressing the transition mid-drag is
 * enough to make it follow the finger 1:1.
 */
@Component({
  selector: 'app-project-carousel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './project-carousel.html',
  styleUrl: './project-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCarousel {
  projects = input.required<Project[]>();
  label = input('Projects');

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  /** The settled slide. Always a whole number. */
  protected readonly active = signal(0);
  /** Fractional offset contributed by an in-flight drag, in slides. */
  protected readonly dragOffset = signal(0);
  protected readonly dragging = signal(false);

  /** Tile tints, cycled so adjacent cards on the rim never repeat a colour. */
  protected readonly tileColors = ['blue', 'yellow', 'green', 'red', 'purple'];

  protected readonly count = computed(() => this.projects().length);
  protected readonly position = computed(() => this.active() + this.dragOffset());
  protected readonly atStart = computed(() => this.active() === 0);
  protected readonly atEnd = computed(() => this.active() >= this.count() - 1);

  protected readonly announcement = computed(() => {
    const current = this.projects()[this.active()];
    if (!current) return '';
    return `Slide ${this.active() + 1} of ${this.count()}: ${current.title}`;
  });

  private pointerId: number | null = null;
  private dragStartX = 0;
  /** Distance along the rim that advances the wheel by exactly one slide. */
  private pitchPx = 0;
  /** Set when a drag travelled far enough that the release should not navigate. */
  private suppressClick = false;

  constructor() {
    // A native capture-phase listener rather than a template binding, because a
    // template binding runs on the bubble: RouterLink handles its own click on
    // the anchor, during the target phase, so a guard waiting for the bubble has
    // already lost. Capturing at the stage is the only point where the click
    // that ends a drag can be stopped before either kind of link acts on it.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stage = this.stage().nativeElement;
      stage.addEventListener('click', this.guardDragRelease, { capture: true });
      destroyRef.onDestroy(() =>
        stage.removeEventListener('click', this.guardDragRelease, { capture: true }),
      );
    });
  }

  private readonly guardDragRelease = (event: Event): void => {
    if (!this.suppressClick) return;
    this.suppressClick = false;

    // detail 0 marks a click synthesised by Enter or Space on a link. There is
    // no gesture behind it, so the drag guard must never swallow it — otherwise
    // a drag released over bare stage leaves the flag standing and the next
    // keyboard activation silently does nothing.
    if ((event as MouseEvent).detail === 0) return;

    event.preventDefault();
    event.stopPropagation();
  };

  protected pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  /**
   * A "Live" chip next to a "Live site" link is noise; a status chip earns its
   * place only when it says something the rest of the card does not — i.e. when
   * the project has not been built yet.
   */
  protected showsStatus(project: Project): boolean {
    return project.status !== 'shipped';
  }

  /** Chips are one non-wrapping row, so the status chip has to buy its width. */
  protected visibleTags(project: Project): string[] {
    return project.tags.slice(0, this.showsStatus(project) ? 1 : 2);
  }

  protected goTo(index: number): void {
    this.active.set(Math.min(Math.max(index, 0), this.count() - 1));
  }

  /**
   * Bring a card to the centre when it is reached by keyboard, so the focus ring
   * is never sitting on a card clipped out of the stage.
   *
   * Gated on :focus-visible because an anchor also takes focus on pointerdown:
   * without the gate, starting a drag on an off-centre card would recentre the
   * wheel out from under the gesture before the first pointermove landed.
   */
  protected onCardFocus(event: FocusEvent, index: number): void {
    const target = event.target as HTMLElement | null;
    if (target?.matches(':focus-visible')) this.goTo(index);
  }

  protected prev(): void {
    this.goTo(this.active() - 1);
  }

  protected next(): void {
    this.goTo(this.active() + 1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        this.prev();
        break;
      case 'ArrowRight':
        this.next();
        break;
      case 'Home':
        this.goTo(0);
        break;
      case 'End':
        this.goTo(this.count() - 1);
        break;
      default:
        return;
    }
    this.followFocusToCentre();
    // Only reached when the key was one we handled, so the page does not also
    // scroll horizontally or jump to top on Home/End.
    event.preventDefault();
  }

  /**
   * The stage clips, so rotating the wheel while a card holds focus would carry
   * the focus ring out of view — the user is left driving something they cannot
   * see. If focus is inside a card that just left the centre, it moves to the
   * card that took its place.
   *
   * Focus on the prev/next buttons is left alone: those live outside the stage,
   * so they are never the ones being rotated away.
   */
  private followFocusToCentre(): void {
    const stage = this.stage().nativeElement;
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement) || !stage.contains(focused)) return;

    const centred = stage.querySelectorAll<HTMLElement>('.slot')[this.active()];
    if (!centred || centred.contains(focused)) return;
    centred.querySelector<HTMLElement>('.project-card-link')?.focus();
  }

  protected onPointerDown(event: PointerEvent): void {
    // Secondary buttons and non-drag inputs are left to the browser.
    if (event.button !== 0 || this.count() < 2) return;

    const stage = this.stage().nativeElement;
    const slot = stage.querySelector<HTMLElement>('.slot');
    // offsetWidth, not getBoundingClientRect: the slots are rotated, and a
    // bounding box would report the rotated envelope rather than the card width.
    this.pitchPx = slot ? slot.offsetWidth * PITCH_RATIO : stage.offsetWidth / 3;

    this.pointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.suppressClick = false;
    this.dragging.set(true);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId || !this.dragging()) return;

    // Past this much travel the gesture is a drag, not a click on a card, and
    // releasing must not follow the link underneath.
    if (!this.suppressClick && Math.abs(event.clientX - this.dragStartX) > CLICK_SLOP_PX) {
      this.suppressClick = true;
      // Capture is taken here, not on pointerdown. While a pointer is captured
      // the browser retargets the resulting click to the capture element, so
      // capturing up front sends every card click to the stage and the card
      // never navigates at all. Taking it only once the gesture has become a
      // real drag leaves plain clicks on their links.
      this.stage().nativeElement.setPointerCapture(event.pointerId);
    }

    const slides = (this.dragStartX - event.clientX) / this.pitchPx;
    // Clamped one slide past each end so a drag at the boundary still gives a
    // little resistance-free travel and then springs back, rather than feeling
    // like the input was dropped.
    const target = this.active() + slides;
    const clamped = Math.min(Math.max(target, -0.6), this.count() - 1 + 0.6);
    this.dragOffset.set(clamped - this.active());
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;

    const stage = this.stage().nativeElement;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);

    const landed = Math.round(this.position());
    this.pointerId = null;
    this.dragging.set(false);
    this.dragOffset.set(0);
    this.goTo(landed);
  }
}

/**
 * Card pitch as a multiple of card width — card plus gutter. Must stay in step
 * with `--card-gap` in the stylesheet, or a drag will not track the pointer.
 */
const PITCH_RATIO = 1.17;

/** Pointer travel below which a press still counts as a click on a card. */
const CLICK_SLOP_PX = 6;
