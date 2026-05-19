import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  label = input.required<string>();
  href = input<string>();
  routerPath = input<string>();
  variant = input<'primary' | 'secondary' | 'ghost'>('primary');
  external = input(false);
}
