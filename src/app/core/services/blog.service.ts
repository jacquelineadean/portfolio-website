import { Injectable, signal, computed } from '@angular/core';
import { BlogPost } from '../models/blog-post.model';
import { BLOG_POSTS } from '../../features/writing/data/blog-posts.generated';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly posts = signal<BlogPost[]>(
    BLOG_POSTS.filter((p) => p.published).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  );

  readonly allPosts = this.posts.asReadonly();

  readonly recentPosts = computed(() => this.posts().slice(0, 5));

  getPostBySlug(slug: string): BlogPost | undefined {
    return this.posts().find((p) => p.slug === slug);
  }

  getPostsByTag(tag: string): BlogPost[] {
    return this.posts().filter((p) => p.tags.includes(tag));
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    this.posts().forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }
}
