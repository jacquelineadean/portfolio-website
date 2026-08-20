import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Title } from '@angular/platform-browser';
import { ScrollReveal } from '../../../../shared/components/scroll-reveal/scroll-reveal';
import { Tag } from '../../../../shared/components/tag/tag';
import { ShareButtons } from '../../../../shared/components/share-buttons/share-buttons';
import { BlogService } from '../../../../core/services/blog.service';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [RouterLink, ScrollReveal, Tag, ShareButtons],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.scss',
})
export class PostDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly blogService = inject(BlogService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly titleService = inject(Title);

  /**
   * The param map as a signal, not `route.snapshot`. The router reuses this
   * component instance between two `/notes/:slug` routes, so a computed reading
   * `snapshot` has nothing to invalidate it and keeps serving the post you
   * arrived from.
   */
  private readonly params = toSignal(this.route.paramMap);

  protected readonly post = computed(() => {
    const slug = this.params()?.get('slug');
    return slug ? this.blogService.getPostBySlug(slug) : undefined;
  });

  protected readonly safeContent = computed(() => {
    const p = this.post();
    return p ? this.sanitizer.bypassSecurityTrustHtml(p.content) : '';
  });

  constructor() {
    effect(() => {
      const post = this.post();
      if (post) this.titleService.setTitle(`${post.title} — Jacqueline Dean`);
    });
  }
}
