import { Component } from '@angular/core';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { BOOKS } from './data/books.data';

@Component({
  selector: 'app-reading',
  standalone: true,
  imports: [ScrollReveal],
  templateUrl: './reading.html',
  styleUrl: './reading.scss',
})
export class Reading {
  protected readonly books = BOOKS;
}
