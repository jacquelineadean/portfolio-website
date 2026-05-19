import { Component } from '@angular/core';
import { SectionHeader } from '../../shared/components/section-header/section-header';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [SectionHeader, ScrollReveal],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  protected readonly interests = [
    { label: 'Service-Oriented Architecture', description: 'API design & service boundaries' },
    { label: 'Legacy Modernization', description: 'Incremental migration strategies' },
    { label: 'Data Pipelines', description: 'Reporting correctness & integrity' },
    { label: 'Performance & Observability', description: 'Tuning & monitoring real systems' },
    { label: 'Developer Experience', description: 'Internal tooling & workflows' },
  ];
}
