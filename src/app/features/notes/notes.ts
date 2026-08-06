import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { BlogService } from '../../core/services/blog.service';
import { BOOKS } from './data/books.data';
import { PODCASTS } from './data/podcasts.data';
import { REFERENCES } from './data/references.data';
import { Podcast } from '../../core/models/podcast.model';

/**
 * Writing and Reading used to be two sections. They are one page now, in two
 * halves: what I've written, and what I'm reading, listening to and returning
 * to. The jump nav at the top is what keeps it navigable rather than a scroll.
 */
@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [RouterLink, ScrollReveal],
  templateUrl: './notes.html',
  styleUrl: './notes.scss',
})
export class Notes {
  private readonly blogService = inject(BlogService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly activeTag = signal<string | null>(null);
  protected readonly allTags = this.blogService.getAllTags();
  protected readonly books = BOOKS;
  protected readonly podcasts = PODCASTS;
  protected readonly references = REFERENCES;

  protected readonly sections = [
    { id: 'writing', label: 'Writing' },
    { id: 'books', label: 'Books' },
    { id: 'listening', label: 'Listening' },
    { id: 'papers', label: 'Papers & articles' },
  ];

  protected readonly filteredPosts = computed(() => {
    const tag = this.activeTag();
    if (!tag) return this.blogService.allPosts();
    return this.blogService.getPostsByTag(tag);
  });

  /** Filtering swaps the list silently, so the result is announced. */
  protected readonly filterAnnouncement = computed(() => {
    const count = this.filteredPosts().length;
    const tag = this.activeTag();
    const noun = count === 1 ? 'post' : 'posts';
    return tag ? `${count} ${noun} tagged ${tag}` : `${count} ${noun}, all tags`;
  });

  protected setTag(tag: string | null): void {
    this.activeTag.set(tag === this.activeTag() ? null : tag);
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
