import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { CASE_STUDIES } from './data/case-studies.data';

@Component({
  selector: 'app-work',
  standalone: true,
  imports: [RouterLink, ScrollReveal],
  templateUrl: './work.html',
  styleUrl: './work.scss',
})
export class Work {
  protected readonly caseStudies = CASE_STUDIES;
  protected readonly tileColors = ['blue', 'yellow', 'green', 'red', 'purple'];
}
