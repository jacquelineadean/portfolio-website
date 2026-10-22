import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroName } from '../../core/hero-name';
import { WORKS } from '../../core/works';
import { Glyphs } from '../../shared/glyphs/glyphs';
import { Fern } from '../../shared/glyphs/specimens/fern';

/**
 * The home page: a fern unfurling in characters beside the name and an index
 * of the work, then one specimen per work, each a natural form drawn in
 * characters from that work's own data.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, Glyphs],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly fern = new Fern();
  protected readonly works = WORKS.map((w) => ({ ...w, instance: w.specimen() }));
  /** A phone's width, read once: the canvases keep the shape they start with. */
  protected readonly narrow =
    typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;

  private readonly heroName = viewChild.required<ElementRef<HTMLElement>>('heroName');

  constructor() {
    const name = inject(HeroName);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // The navbar's 4.75rem bar covers the top of the screen, so the name
      // counts as on screen only below it.
      const view = new IntersectionObserver(([entry]) => name.visible.set(entry.isIntersecting), {
        rootMargin: '-76px 0px 0px 0px',
      });
      view.observe(this.heroName().nativeElement);
      destroyRef.onDestroy(() => {
        view.disconnect();
        name.visible.set(false);
      });
    });
  }

  protected pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  protected scrollTo(event: Event, slug: string): void {
    event.preventDefault();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(slug)
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
}
