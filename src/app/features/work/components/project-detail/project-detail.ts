import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ScrollReveal } from '../../../../shared/components/scroll-reveal/scroll-reveal';
import { PROJECTS } from '../../data/projects.data';
import { ProjectArt } from '../../../../shared/components/project-art/project-art';
import { TileTint, tintFor } from '../../../../shared/art/tints';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, ScrollReveal, ProjectArt],
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

  /**
   * Taken from the project's position in the list rather than stored on the
   * project, because it is the same rule the card grid and the carousel use —
   * the colour belongs to the slot, not to the work.
   */
  protected readonly tint = computed<TileTint>(() =>
    tintFor(PROJECTS.findIndex((p) => p.slug === this.project()?.slug)),
  );

  constructor() {
    // Setting the title is a side effect, so it belongs in an effect rather than
    // inside the computed that resolves the project.
    effect(() => {
      const project = this.project();
      if (project) this.titleService.setTitle(`${project.title} — Jacqueline Dean`);
    });
  }
}
