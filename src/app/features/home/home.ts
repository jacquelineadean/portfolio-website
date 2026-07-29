import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Button } from '../../shared/components/button/button';
import { SectionHeader } from '../../shared/components/section-header/section-header';
import { BlogService } from '../../core/services/blog.service';
import { CASE_STUDIES } from '../work/data/case-studies.data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ScrollReveal, Button, SectionHeader],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly blogService = inject(BlogService);

  protected readonly caseStudies = CASE_STUDIES;
  protected readonly recentPosts = this.blogService.recentPosts().slice(0, 3);

  protected readonly tileColors = ['blue', 'yellow', 'green', 'red', 'purple'];

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

  protected readonly principles = [
    'API-first design',
    'Incremental over big-bang',
    'Data correctness',
    'Boring on purpose',
  ];
}
