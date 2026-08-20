import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DoodleShape, doodle } from '../../art/doodles';

/**
 * One hand-drawn mark. Purely decorative and always hidden from assistive
 * technology; the host is positioned by whatever page places it.
 */
@Component({
  selector: 'app-doodle',
  standalone: true,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + mark().width + ' ' + mark().height"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      @for (path of mark().paths; track $index) {
        <path [attr.d]="path" pathLength="1" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      color: var(--color-ink);
      pointer-events: none;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    path {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
      opacity: 0.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Doodle {
  shape = input<DoodleShape>('sweep');
  /** Two marks of the same shape with different seeds are different lines. */
  seed = input('a');

  protected readonly mark = computed(() => doodle(this.shape(), this.seed()));
}
