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
import { ShareButtons } from '../../../../shared/components/share-buttons/share-buttons';
import { BlogService } from '../../../../core/services/blog.service';
import markup from './artifact/article.html' with { loader: 'text' };
import styles from './artifact/article.css' with { loader: 'text' };
import { mountArticle } from './artifact/article';

/** Matches src/content/blog/four-mental-models-illustrated.md and the route in notes.routes.ts. */
const SLUG = 'four-mental-models-illustrated';

/**
 * Fonts for the article. A shadow root cannot register its own @font-face
 * rules, so the stylesheet goes in the document head.
 */
const FONTS_ID = 'four-mental-models-fonts';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Gloock&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;1,7..72,400;1,7..72,500&family=Schibsted+Grotesk:wght@400;500;600;700&family=Shantell+Sans:wght@400;500;600&display=swap';

/**
 * "Four Mental Models, Illustrated": an interactive post, so it is not rendered
 * from markdown. The markdown file supplies the listing metadata; this component
 * renders the article into a shadow root, where its own type, colors and
 * element styles stay apart from the site's, and runs its script there.
 */
@Component({
  selector: 'app-four-mental-models',
  standalone: true,
  imports: [RouterLink, ScrollReveal, ShareButtons],
  templateUrl: './four-mental-models.html',
  styleUrl: './four-mental-models.scss',
})
export class FourMentalModels {
  protected readonly post = inject(BlogService).getPostBySlug(SLUG);
  protected readonly title = this.post?.title ?? 'Four Mental Models, Illustrated';

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
