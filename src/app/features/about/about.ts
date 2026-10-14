import { Component } from '@angular/core';
import { ScrollReveal } from '../../shared/components/scroll-reveal/scroll-reveal';
import { Strangler } from '../../shared/components/labs/strangler/strangler';
import { MerkleDiff } from '../../shared/components/labs/merkle-diff/merkle-diff';

/**
 * Two labs in place of a list of interests: the two techniques the work above
 * depends on, moving traffic off a monolith and checking that migrated data
 * matches its source.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [ScrollReveal, Strangler, MerkleDiff],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {}
