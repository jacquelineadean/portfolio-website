import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ScrollReveal } from '../../../../shared/components/scroll-reveal/scroll-reveal';
import { Tag } from '../../../../shared/components/tag/tag';
import { ShareButtons } from '../../../../shared/components/share-buttons/share-buttons';
import { BlogService } from '../../../../core/services/blog.service';
import markup from './artifact/article.html' with { loader: 'text' };
import styles from './artifact/article.css' with { loader: 'text' };
import { mountArticle } from './artifact/article';

/** Matches src/content/blog/ai-inference-stack.md and the route in notes.routes.ts. */
const SLUG = 'ai-inference-stack';

/**
 * Fonts for the article. A shadow root cannot register its own @font-face
 * rules, so the stylesheet goes in the document head.
 */
const FONTS_ID = 'ai-inference-stack-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800&family=IBM+Plex+Sans+Condensed:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Shantell+Sans:wght@500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap';

/**
 * "The AI Inference Stack": an interactive post, so it is not rendered from
 * markdown. The markdown file supplies the listing metadata; this component
 * renders the field guide into a shadow root, where its own type, colors and
 * element styles stay apart from the site's, and runs its script there.
 */
@Component({
  selector: 'app-ai-inference-stack',
  standalone: true,
  imports: [RouterLink, ScrollReveal, Tag, ShareButtons],
  templateUrl: './ai-inference-stack.html',
  styleUrl: './ai-inference-stack.scss',
})
export class AiInferenceStack {
  protected readonly post = inject(BlogService).getPostBySlug(SLUG);
  protected readonly title = this.post?.title ?? 'The AI Inference Stack';

  private readonly article = viewChild.required<ElementRef<HTMLElement>>('article');

  constructor() {
    inject(Title).setTitle(`${this.title} — Jacqueline Dean`);

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!document.getElementById(FONTS_ID)) {
        const link = document.createElement('link');
        link.id = FONTS_ID;
        link.rel = 'stylesheet';
        link.href = FONTS_HREF;
        document.head.append(link);
      }

      const root = this.article().nativeElement.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${styles}</style>${markup}`;
      destroyRef.onDestroy(mountArticle(root));
    });
  }
}
