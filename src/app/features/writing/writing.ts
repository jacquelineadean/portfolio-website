import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeader } from '../../shared/components/section-header/section-header';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Tag } from '../../shared/components/tag/tag';
import { BlogService } from '../../core/services/blog.service';

@Component({
  selector: 'app-writing',
  standalone: true,
  imports: [RouterLink, SectionHeader, ScrollReveal, Tag],
  templateUrl: './writing.html',
  styleUrl: './writing.scss',
})
export class Writing {
  private readonly blogService = inject(BlogService);

  protected readonly activeTag = signal<string | null>(null);
  protected readonly allTags = this.blogService.getAllTags();

  protected readonly filteredPosts = computed(() => {
    const tag = this.activeTag();
    if (!tag) return this.blogService.allPosts();
    return this.blogService.getPostsByTag(tag);
  });

  protected setTag(tag: string | null): void {
    this.activeTag.set(tag === this.activeTag() ? null : tag);
  }
}
