import { Podcast } from '../../../core/models/podcast.model';

/**
 * Shows I listen to. Nothing here is mine — the host credit belongs to whoever
 * makes the show, and the copy says "listening to" rather than anything that
 * could read as authorship.
 */
export const PODCASTS: Podcast[] = [
  {
    name: 'System Design Deep Dive',
    publisher: 'System Sage',
    note: 'Walks a system design problem end to end — notification fan-out, distributed schedulers, marketplace pricing — from database fundamentals up to distributed-systems patterns. Useful for keeping the vocabulary sharp between the times I actually get to make these decisions.',
    embedUrl: 'https://open.spotify.com/embed/show/3KAkF0bZXEYkYVHhVQdvia?utm_source=generator',
    url: 'https://open.spotify.com/show/3KAkF0bZXEYkYVHhVQdvia',
  },
];
