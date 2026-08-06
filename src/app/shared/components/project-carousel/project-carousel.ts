import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

export interface CarouselProject {
  slug: string;
  title: string;
  subtitle: string;
  tags: string[];
}

/**
 * Wheel carousel.
 *
 * The slides are not on a translating rail — they ride the rim of a very large
 * circle, so advancing rotates the whole wheel and the neighbouring cards tilt
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
  projects = input.required<CarouselProject[]>();
  label = input('Case studies');

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  /** The settled slide. Always a whole number. */
  protected readonly active = signal(0);
  /** Fractional offset contributed by an in-flight drag, in slides. */
  protected readonly dragOffset = signal(0);
  protected readonly dragging = signal(false);

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

  protected pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
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
    // Only reached when the key was one we handled, so the page does not also
    // scroll horizontally or jump to top on Home/End.
    event.preventDefault();
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
    stage.setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId || !this.dragging()) return;

    // Past this much travel the gesture is a drag, not a click on a card, and
    // releasing must not follow the link underneath.
    if (Math.abs(event.clientX - this.dragStartX) > CLICK_SLOP_PX) this.suppressClick = true;

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

  protected onCardClick(event: MouseEvent): void {
    if (!this.suppressClick) return;
    // The click that ends a drag would otherwise navigate to whichever card the
    // pointer happened to be released over.
    event.preventDefault();
    this.suppressClick = false;
  }
}

/**
 * Card pitch as a multiple of card width — card plus gutter. Must stay in step
 * with `--card-gap` in the stylesheet, or a drag will not track the pointer.
 */
const PITCH_RATIO = 1.17;

/** Pointer travel below which a press still counts as a click on a card. */
const CLICK_SLOP_PX = 6;
