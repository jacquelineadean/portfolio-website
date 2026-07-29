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
  /** Title text; may contain <em> for italic serif accent words. */
  title = input.required<string>();
  subtitle = input<string>();
  eyebrow = input<string>();
  sparkleColor = input<'blue' | 'red' | 'yellow' | 'green' | 'purple'>('blue');
  align = input<'left' | 'center'>('left');
}
