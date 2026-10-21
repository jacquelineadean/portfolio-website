import { ArtVariant } from '../../shared/art/generators';

/**
 * What a section shows in place of paragraphs.
 *
 * `figure` is a chronicle animation: public/projects/<slug>/<name>-wide.svg and
 * -tall.svg, built by scripts/figures/build.mjs. `chips` is a row of labels.
 * `phases` is a roadmap track, each phase marked proven or only built.
 */
export type ProjectVisual =
  | { kind: 'figure'; name: string }
  | { kind: 'chips'; items: string[] }
  | { kind: 'phases'; phases: ProjectPhase[] };

export interface ProjectPhase {
  label: string;
  name: string;
  /** `proven` met its exit criteria; `built` exists and waits on its proof. */
  state: 'proven' | 'built';
  detail?: string;
}

export interface ProjectSection {
  title: string;
  /** One line. The visual carries the rest. */
  caption: string;
  visual?: ProjectVisual;
}

export interface ProjectLink {
  label: string;
  href: string;
}

/**
 * `shipped` projects are deployed and linkable. `in-design` ones are stated
 * intent — they carry a visible status so nothing on the page reads as a claim
 * about work that does not exist yet.
 */
export type ProjectStatus = 'shipped' | 'in-design';

export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  tags: string[];
  status: ProjectStatus;
  /** Rendered as the status chip and in the detail hero. */
  statusLabel: string;
  links: ProjectLink[];
  /** Which generated drawing stands in for the project on its card. */
  art: ArtVariant;
  /** The chronicle figure at the top of the project page. */
  hero: string;
  sections: ProjectSection[];
}
