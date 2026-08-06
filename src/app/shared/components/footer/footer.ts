import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_LINKS } from '../../../core/site';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  protected readonly currentYear = new Date().getFullYear();
  protected readonly links = SITE_LINKS;
}
