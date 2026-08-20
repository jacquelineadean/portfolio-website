import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Button } from '../../shared/components/button/button';
import { SectionHeader } from '../../shared/components/section-header/section-header';
import { BlogService } from '../../core/services/blog.service';
import { PROJECTS } from '../work/data/projects.data';
import { ProjectArt } from '../../shared/components/project-art/project-art';
import { Doodle } from '../../shared/components/doodle/doodle';
import { SystemSketch } from '../../shared/components/system-sketch/system-sketch';
import { TileTint, tintFor } from '../../shared/art/tints';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ScrollReveal, Button, SectionHeader, ProjectArt, Doodle, SystemSketch],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly blogService = inject(BlogService);

  protected readonly projects = PROJECTS;
  protected readonly recentPosts = this.blogService.recentPosts().slice(0, 3);

  protected readonly skills = [
    'System design',
    'Spring Boot',
    'Angular',
    'PostgreSQL',
    'REST APIs',
    'Microservices',
    'Legacy modernization',
    'Data migrations',
    'Cloud native',
    'API-first',
  ];

  protected tint(index: number): TileTint {
    return tintFor(index);
  }

  protected readonly principles = [
    'API-first design',
    'Incremental over big-bang',
    'Data correctness',
    'Boring on purpose',
  ];
}
