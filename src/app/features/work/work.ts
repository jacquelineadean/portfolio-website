import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeader } from '../../shared/components/section-header/section-header';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Tag } from '../../shared/components/tag/tag';
import { CASE_STUDIES } from './data/case-studies.data';

@Component({
  selector: 'app-work',
  standalone: true,
  imports: [RouterLink, SectionHeader, ScrollReveal, Tag],
  templateUrl: './work.html',
  styleUrl: './work.scss',
})
export class Work {
  protected readonly caseStudies = CASE_STUDIES;
}
