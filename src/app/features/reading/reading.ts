import { Component } from '@angular/core';
import { SectionHeader } from '../../shared/components/section-header/section-header';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Tag } from '../../shared/components/tag/tag';
import { BOOKS } from './data/books.data';

@Component({
  selector: 'app-reading',
  standalone: true,
  imports: [SectionHeader, ScrollReveal, Tag],
  templateUrl: './reading.html',
  styleUrl: './reading.scss',
})
export class Reading {
  protected readonly books = BOOKS;
}
