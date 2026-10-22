import { Component, signal, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { HeroName } from '../../../core/hero-name';
import { SITE_LINKS } from '../../../core/site';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  protected readonly navLinks = [
    { path: '/about', label: 'About', exact: false },
    { path: '/work', label: 'Projects', exact: false },
    { path: '/notes', label: 'Notes', exact: false },
  ];

  /** The site's only contact channel — there is deliberately no email on the page. */
  protected readonly linkedInUrl = SITE_LINKS.linkedin;

  /** The logo's star flashes on every arrival at a page. */
  protected readonly ding = signal(false);

  /** Home's large name is on screen, so the bar leaves its own out. */
  protected readonly nameShown = inject(HeroName).visible;

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.ding.set(false);
        requestAnimationFrame(() => this.ding.set(true));
      });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 50);
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
