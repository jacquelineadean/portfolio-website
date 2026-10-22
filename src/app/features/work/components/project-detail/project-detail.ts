import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ScrollReveal } from '../../../../shared/components/scroll-reveal/scroll-reveal';
import { PROJECTS } from '../../data/projects.data';
import { ChronicleFigure } from '../../../../shared/components/chronicle-figure/chronicle-figure';
import { Pathfinder } from '../../../../shared/components/labs/pathfinder/pathfinder';
import { Glyphs } from '../../../../shared/glyphs/glyphs';
import { workFor } from '../../../../core/works';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, ScrollReveal, ChronicleFigure, Pathfinder, Glyphs],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
})
export class ProjectDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  /**
   * The param map as a signal, not `route.snapshot`.
   *
   * The router reuses this component instance when you move between two
   * `/work/:slug` routes, so a computed reading `snapshot` has nothing to
   * invalidate it and keeps serving the project you arrived from.
   */
  private readonly params = toSignal(this.route.paramMap);

  protected readonly project = computed(() =>
    PROJECTS.find((p) => p.slug === this.params()?.get('slug')),
  );

  protected readonly work = computed(() => {
    const slug = this.project()?.slug;
    return slug ? workFor(slug) : undefined;
  });
  /** A specimen of its own for this page, rebuilt when the project changes. */
  protected readonly specimen = computed(() => this.work()?.specimen());
  /** A phone's width, read once: the canvas keeps the shape it starts with. */
  protected readonly narrow =
    typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;

  /** A figure's file pair under public/projects/, without the layout suffix. */
  protected figure(slug: string, name: string): string {
    return `projects/${slug}/${name}`;
  }

  constructor() {
    // Setting the title is a side effect, so it belongs in an effect rather than
    // inside the computed that resolves the project.
    effect(() => {
      const project = this.project();
      if (project) this.titleService.setTitle(`${project.title} — Jacqueline Dean`);
    });
  }
}
