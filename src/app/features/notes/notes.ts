import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { BlogService } from '../../core/services/blog.service';
import { PODCASTS } from './data/podcasts.data';
import { READING } from './data/reading.data';
import { Podcast } from '../../core/models/podcast.model';
import { ReadingItem } from '../../core/models/reading.model';

/**
 * One page in three sections: posts, reading (books, papers and articles on one
 * card grid) and listening. The jump nav at the top links to each section.
 */
@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [RouterLink, ScrollReveal, NgTemplateOutlet],
  templateUrl: './notes.html',
  styleUrl: './notes.scss',
})
export class Notes {
  private readonly blogService = inject(BlogService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly posts = this.blogService.allPosts;
  protected readonly reading = READING;
  protected readonly podcasts = PODCASTS;

  /** Card spine tints, cycled so no two neighbours in the grid repeat. */
  protected readonly tileColors = ['blue', 'yellow', 'green', 'red', 'purple'];

  protected readonly sections = [
    { id: 'writing', label: 'Blog' },
    { id: 'reading', label: 'Reading' },
    { id: 'listening', label: 'Listening' },
  ];

  /** "Book", or "Paper · Communications of the ACM · 2013". */
  protected kindLine(item: ReadingItem): string {
    const kind = item.kind[0].toUpperCase() + item.kind.slice(1);
    return [kind, item.source, item.year].filter(Boolean).join(' · ');
  }

  /**
   * The router's anchorScrolling moves the viewport and nothing else — focus and
   * the screen-reader cursor stay on the jump link, so the next Tab goes to the
   * next jump link rather than into the section the user was just told they had
   * jumped to. Focusing the section itself is what actually moves them.
   *
   * The explicit scroll covers the second activation of the same link, which the
   * router treats as a no-op navigation because the URL has not changed.
   */
  protected focusSection(id: string): void {
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      target?.scrollIntoView();
      target?.focus({ preventScroll: true });
    });
  }

  /**
   * Click-to-load for the Spotify players.
   *
   * `loading="lazy"` only postpones the request until the frame nears the
   * viewport — anyone who scrolls this far still hands Spotify their IP, user
   * agent and referring origin without having asked for a player. Gating on a
   * click means the third-party request happens only when someone actually
   * wants to listen, and it keeps the rest of the site free of embedded
   * trackers.
   */
  private readonly loaded = signal(new Set<string>());

  /**
   * Trusted once, up front. Calling bypassSecurityTrustResourceUrl from a
   * template method would mint a new SafeValue on every change-detection pass,
   * and Angular compares those by reference — the iframe would be rewritten
   * (and the player restarted) on every tick.
   */
  private readonly safeEmbeds = new Map<string, SafeResourceUrl>(
    PODCASTS.map((p) => [p.url, this.sanitizer.bypassSecurityTrustResourceUrl(p.embedUrl)]),
  );

  protected isLoaded(podcast: Podcast): boolean {
    return this.loaded().has(podcast.url);
  }

  protected loadPlayer(podcast: Podcast): void {
    this.loaded.update((set) => new Set(set).add(podcast.url));
  }

  protected embedUrl(podcast: Podcast): SafeResourceUrl | undefined {
    return this.safeEmbeds.get(podcast.url);
  }
}
