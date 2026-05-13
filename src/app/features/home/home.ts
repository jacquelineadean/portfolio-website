import { Component } from '@angular/core';
import { AnimatedText } from '../../shared/components/animated-text/animated-text';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Button } from '../../shared/components/button/button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AnimatedText, ScrollReveal, Button],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
