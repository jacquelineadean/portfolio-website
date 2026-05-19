import { Component, computed, inject } from '@angular/core';
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

  protected readonly post = computed(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    const found = slug ? this.blogService.getPostBySlug(slug) : undefined;
    if (found) {
      this.titleService.setTitle(`${found.title} — Jacqueline Dean`);
    }
    return found;
  });

  protected readonly safeContent = computed(() => {
    const p = this.post();
    return p ? this.sanitizer.bypassSecurityTrustHtml(p.content) : '';
  });
}
