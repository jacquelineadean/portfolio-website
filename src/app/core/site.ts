/**
 * The site's outbound identity links.
 *
 * There is no email address and no resume PDF on this site by design, which
 * makes the LinkedIn URL the only way anyone can make contact. It lives here
 * rather than in three templates so that changing the handle cannot leave a
 * dead contact link behind in the one place nobody grepped.
 */
export const SITE_LINKS = {
  linkedin: 'https://www.linkedin.com/in/jacquelineadean',
  github: 'https://github.com/jacquelineadean',
} as const;
