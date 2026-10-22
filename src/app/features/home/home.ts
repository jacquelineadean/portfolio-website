import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  /** A row of measuring ticks, as along the edge of a specimen photograph. */
  protected readonly ticks = '- | '.repeat(60);
  /** A phone's width, read once: the canvases keep the shape they start with. */
  protected readonly narrow =
    typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;

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
