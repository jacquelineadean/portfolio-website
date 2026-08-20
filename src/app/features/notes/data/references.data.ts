import { Reference } from '../../../core/models/reference.model';

export const REFERENCES: Reference[] = [
  {
    title: 'The Tail at Scale',
    authors: 'Jeffrey Dean, Luiz André Barroso',
    publisher: 'Communications of the ACM, Vol. 56 No. 2, pp. 74–80',
    year: '2013',
    url: 'https://research.google/pubs/the-tail-at-scale/',
    note: 'Why a request that fans out to hundreds of servers has its latency set by the slowest component rather than the average one, and the specific countermeasures — hedged and tied requests, micro-partitioning, selective replication — available when p99 is the number that actually hurts.',
  },
  {
    title: 'The Friendship That Made Google Huge',
    authors: 'James Somers',
    publisher: 'The New Yorker',
    year: '2018',
    url: 'https://www.newyorker.com/magazine/2018/12/10/the-friendship-that-made-google-huge',
    note: 'A profile of the working partnership between Jeff Dean and Sanjay Ghemawat. I keep it on the list as a counterweight to the lone-genius story of how infrastructure gets built.',
  },
];
