export interface Podcast {
  name: string;
  publisher: string;
  /** Why it's here — one concrete sentence, not a blurb. */
  note: string;
  /** open.spotify.com/embed/... — used as a literal iframe src, never bound. */
  embedUrl: string;
  /** The normal share link, for anyone who would rather not load the embed. */
  url: string;
}
