export interface ProjectSection {
  title: string;
  content: string[];
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
  sections: ProjectSection[];
}
