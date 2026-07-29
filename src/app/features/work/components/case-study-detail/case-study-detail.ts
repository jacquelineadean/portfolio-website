import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ScrollReveal } from '../../../../shared/components/scroll-reveal/scroll-reveal';
import { CASE_STUDIES } from '../../data/case-studies.data';

@Component({
  selector: 'app-case-study-detail',
  standalone: true,
  imports: [RouterLink, ScrollReveal],
  templateUrl: './case-study-detail.html',
  styleUrl: './case-study-detail.scss',
})
export class CaseStudyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  protected readonly study = computed(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    const found = CASE_STUDIES.find((s) => s.slug === slug);
    if (found) {
      this.titleService.setTitle(`${found.title} — Jacqueline Dean`);
    }
    return found;
  });
}
