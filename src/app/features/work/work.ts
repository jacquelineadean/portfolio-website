import { Component } from '@angular/core';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { ProjectCarousel } from '../../shared/components/project-carousel/project-carousel';
import { CASE_STUDIES } from './data/case-studies.data';

@Component({
  selector: 'app-work',
  standalone: true,
  imports: [ScrollReveal, ProjectCarousel],
  templateUrl: './work.html',
  styleUrl: './work.scss',
})
export class Work {
  protected readonly caseStudies = CASE_STUDIES;
}
