import { Component, input } from '@angular/core';
import { ScrollReveal } from '../scroll-reveal/scroll-reveal';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [ScrollReveal],
  templateUrl: './section-header.html',
  styleUrl: './section-header.scss',
})
export class SectionHeader {
  /** Title text; may contain <em>, which renders upright (no italic in this system). */
  title = input.required<string>();
  subtitle = input<string>();
  eyebrow = input<string>();
  align = input<'left' | 'center'>('left');
}
