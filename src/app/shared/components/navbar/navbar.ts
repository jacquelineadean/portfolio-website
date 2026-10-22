import { Component, signal, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
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

  /** The logo's star flashes on every arrival, like the elevator's floor lamp on Home. */
  protected readonly ding = signal(false);

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
