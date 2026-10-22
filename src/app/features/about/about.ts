import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogService } from '../../core/services/blog.service';
import { Glyphs } from '../../shared/glyphs/glyphs';
import { LoopVideo } from '../../shared/components/loop-video/loop-video';
import { Footage } from '../../shared/glyphs/specimens/footage';
import { PROJECTS } from '../work/data/projects.data';

interface Reel {
  kind: string;
  title: string;
  caption: string;
  link: string[];
  label: string;
  ratio: number;
  wide: boolean;
  /** Drawn in characters, or, for a recording of text, played as it is. */
  specimen?: Footage;
  video?: { src: string; poster: string };
}

/**
 * About, without a biography: the work itself. The pathfinding recording
 * plays live through the glyph ramp, a maze redrawn in characters; the
 * terminal recording is text already, so it plays as it is; the two posts
 * are their opening plates, drawn in characters.
 *
 * The pathfinding clip is recorded from a local build of the Algorithm
 * Visualizer (its pathfinding page: Dijkstra, then A*, then BFS over one
 * maze). The terminal clip is docs/media/loop.gif from the Readiness Loop
 * repository, a recording of a real run, re-encoded.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, Glyphs, LoopVideo],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  private readonly blog = inject(BlogService);

  protected readonly reels: Reel[] = [
    {
      kind: 'Project, running',
      title: project('algorithm-visualizer'),
      caption: 'Dijkstra, A* and BFS over the same maze, from a recording of the app.',
      link: ['/work', 'algorithm-visualizer'],
      specimen: new Footage({
        video: 'recordings/algorithm-visualizer-pathfinding',
        poster: 'recordings/algorithm-visualizer-pathfinding.webp',
        light: true,
      }),
      label:
        'A recording of the Algorithm Visualizer pathfinding page, drawn in characters: three searches over one maze',
      ratio: 5 / 2,
      wide: true,
    },
    {
      kind: 'Project, running',
      title: project('readiness-loop'),
      caption: 'A real run on the Oklahoma tornado contract. The leaky model is rejected.',
      link: ['/work', 'readiness-loop'],
      video: { src: 'recordings/readiness-loop-run', poster: 'recordings/readiness-loop-run.webp' },
      label:
        'Terminal recording of readiness loop on the tornado-ok contract: three baselines fail the contract and the leaky oracle is rejected by the leakage canary.',
      ratio: 1004 / 640,
      wide: true,
    },
    this.post(
      'four-mental-models-illustrated',
      'four-mental-models',
      2400 / 1350,
      'Capacity math, Kafka partitioning, PagedAttention and resharding, as labs.',
    ),
    this.post(
      'ai-inference-stack',
      'ai-inference-stack',
      16 / 9,
      'Seven layers between an API call and a GPU, as labs.',
    ),
  ];

  private post(slug: string, folder: string, ratio: number, caption: string): Reel {
    const post = this.blog.getPostBySlug(slug);
    return {
      kind: 'Post',
      title: post?.title ?? slug,
      caption,
      link: ['/notes', slug],
      specimen: new Footage({ poster: `blog/${folder}/hero.webp`, light: true }),
      label: `The opening plate of ${post?.title ?? slug}, drawn in characters`,
      ratio,
      wide: false,
    };
  }
}

function project(slug: string): string {
  return PROJECTS.find((p) => p.slug === slug)?.title ?? slug;
}
