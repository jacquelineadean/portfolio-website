import { Component } from '@angular/core';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Button } from '../../shared/components/button/button';

@Component({
  selector: 'app-resume',
  standalone: true,
  imports: [ScrollReveal, Button],
  templateUrl: './resume.html',
  styleUrl: './resume.scss',
})
export class Resume {}
