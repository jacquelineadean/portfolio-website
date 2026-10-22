import { Injectable, signal } from '@angular/core';

/**
 * Whether the home page's large name is on screen. The navbar hides its own
 * name meanwhile, so the page never shows the name twice.
 */
@Injectable({ providedIn: 'root' })
export class HeroName {
  readonly visible = signal(false);
}
