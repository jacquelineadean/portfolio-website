import { ReadingItem } from '../../../core/models/reading.model';

export const READING: ReadingItem[] = [
  {
    kind: 'book',
    title: 'The Pragmatic Programmer',
    authors: 'David Thomas & Andrew Hunt',
    note: 'Tracer bullets: a thin path through every layer of a system, built first and kept, so integration problems show up on day one. Prototypes are built to answer one question and then thrown away. DRY means one authoritative source for each piece of knowledge, which covers more than copied code.',
  },
  {
    kind: 'book',
    title: 'Algorithms to Live By',
    authors: 'Brian Christian & Tom Griffiths',
    note: 'Each chapter takes one computer science result to an everyday decision: the 37% rule from optimal stopping, LRU and Bélády’s algorithm from caching, exponential backoff from networking, and the priority inversion that kept resetting the Mars Pathfinder lander in 1997.',
  },
  {
    kind: 'book',
    title: 'The Code Book',
    authors: 'Simon Singh',
    note: 'Ciphers and the attacks that broke them: frequency analysis against substitution ciphers, Babbage’s break of the Vigenère cipher, and the Bletchley Park bombes against Enigma. The last chapters cover the key distribution problem and how Diffie-Hellman key exchange and RSA solved it.',
  },
  {
    kind: 'paper',
    title: 'The Tail at Scale',
    authors: 'Jeffrey Dean & Luiz André Barroso',
    source: 'Communications of the ACM',
    year: '2013',
    url: 'https://research.google/pubs/the-tail-at-scale/',
    note: 'A request that fans out to 100 servers waits for the slowest one. If each server is slow 1% of the time, 63% of those requests are slow. The fixes are hedged requests, tied requests, micro-partitioning and selective replication.',
  },
  {
    kind: 'article',
    title: 'The Friendship That Made Google Huge',
    authors: 'James Somers',
    source: 'The New Yorker',
    year: '2018',
    url: 'https://www.newyorker.com/magazine/2018/12/10/the-friendship-that-made-google-huge',
    note: 'Jeff Dean and Sanjay Ghemawat co-wrote MapReduce and Bigtable, much of it pair programming at one computer. A counterweight to the lone-genius account of how infrastructure gets built.',
  },
];
