/** Books, papers and articles share one card, so they share one shape. */
export type ReadingKind = 'book' | 'paper' | 'article';

export interface ReadingItem {
  kind: ReadingKind;
  title: string;
  authors: string;
  /** Journal or publication, for papers and articles. Books leave it out. */
  source?: string;
  year?: string;
  /** Set for anything readable online. The whole card becomes the link. */
  url?: string;
  /** What the piece covers, in its own terms: the mechanisms, results and numbers. */
  note: string;
}
