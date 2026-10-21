import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Button } from '../../shared/components/button/button';
import { BlogService } from '../../core/services/blog.service';
import { PROJECTS } from '../work/data/projects.data';
import { ProjectArt } from '../../shared/components/project-art/project-art';
import { RequestFlow } from '../../shared/components/labs/request-flow/request-flow';
import { Pathfinder } from '../../shared/components/labs/pathfinder/pathfinder';
import { TileTint, tintFor } from '../../shared/art/tints';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ScrollReveal, Button, ProjectArt, Pathfinder, RequestFlow],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly blogService = inject(BlogService);

  protected readonly projects = PROJECTS;
  protected readonly recentPosts = this.blogService.recentPosts().slice(0, 3);

  protected tint(index: number): TileTint {
    return tintFor(index);
  }
}
