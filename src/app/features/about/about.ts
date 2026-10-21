import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { LoopVideo } from '../../shared/components/loop-video/loop-video';
import { BlogService } from '../../core/services/blog.service';
import { PROJECTS } from '../work/data/projects.data';

type Media =
  | { kind: 'video'; src: string; poster: string; ratio: string; label: string; dark?: boolean }
  | { kind: 'image'; src: string; alt: string };

interface WorkItem {
  eyebrow: string;
  title: string;
  caption: string;
  link: string[];
  media: Media;
  /** Where the picture comes from, so nothing on the page is a stand-in. */
  credit: string;
}

/**
 * The work itself, one plate each: the two projects shown by recordings of
 * the projects running, and the published posts by their own illustrations.
 *
 * The pathfinding clip is recorded from a local build of the Algorithm
 * Visualizer repository (its live pathfinding page, Dijkstra then A* then BFS
 * over the same scattered maze). The terminal clip is docs/media/loop.gif from
 * the Readiness Loop repository, a recording of a real run, re-encoded.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, ScrollReveal, LoopVideo],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  private readonly blog = inject(BlogService);

  protected readonly items: WorkItem[] = [
    {
      eyebrow: 'Project',
      title: project('algorithm-visualizer'),
      caption: 'Dijkstra, A* and BFS over the same maze, each step cited.',
      link: ['/work', 'algorithm-visualizer'],
      media: {
        kind: 'video',
        src: 'recordings/algorithm-visualizer-pathfinding',
        poster: 'recordings/algorithm-visualizer-pathfinding.webp',
        ratio: '5 / 2',
        label:
          'Recording of the Algorithm Visualizer pathfinding page: Dijkstra, A* and breadth-first search each search the same maze and draw the shortest path.',
      },
      credit: 'Recorded from the app’s pathfinding page',
    },
    {
      eyebrow: 'Project',
      title: project('readiness-loop'),
      caption:
        'Four models scored against the Oklahoma tornado contract; the leaky one is rejected.',
      link: ['/work', 'readiness-loop'],
      media: {
        kind: 'video',
        src: 'recordings/readiness-loop-run',
        poster: 'recordings/readiness-loop-run.webp',
        ratio: '1004 / 640',
        dark: true,
        label:
          'Terminal recording of readiness loop on the tornado-ok contract: three baselines fail the contract and the leaky oracle is rejected by the leakage canary.',
      },
      credit: 'Recording of a real run, from the project’s docs',
    },
    this.post(
      'four-mental-models-illustrated',
      'four-mental-models',
      'Capacity math, Kafka partitioning, PagedAttention and resharding, as labs.',
    ),
    this.post(
      'ai-inference-stack',
      'ai-inference-stack',
      'Seven layers between an API call and a GPU, as labs.',
    ),
  ];

  private post(slug: string, images: string, caption: string): WorkItem {
    const post = this.blog.getPostBySlug(slug);
    return {
      eyebrow: post ? `Post · ${post.date}` : 'Post',
      title: post?.title ?? slug,
      caption,
      link: ['/notes', slug],
      media: { kind: 'image', src: `blog/${images}/hero.webp`, alt: '' },
      credit: 'The post’s opening illustration',
    };
  }
}

function project(slug: string): string {
  return PROJECTS.find((p) => p.slug === slug)?.title ?? slug;
}
