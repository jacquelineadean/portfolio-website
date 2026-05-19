import { Book } from '../../../core/models/book.model';

export const BOOKS: Book[] = [
  {
    title: 'The Pragmatic Programmer',
    author: 'David Thomas & Andrew Hunt',
    reflection:
      'Reinforced the importance of maintainable abstractions and incremental improvement. The concept of "tracer bullets" — building thin, end-to-end slices to validate architecture — directly influences how I approach new system design.',
    tags: ['engineering', 'craft'],
  },
  {
    title: 'Algorithms to Live By',
    author: 'Brian Christian & Tom Griffiths',
    reflection:
      'Reframed engineering decisions as optimization problems under uncertainty. The explore/exploit tradeoff alone changed how I think about when to invest in learning new tools versus deepening expertise in familiar ones.',
    tags: ['decision-making', 'systems'],
  },
  {
    title: 'The Code Book',
    author: 'Simon Singh',
    reflection:
      'Deepened my appreciation for the historical foundations of modern cryptography and secure systems. A reminder that the problems we solve in software have roots stretching back centuries.',
    tags: ['history', 'security'],
  },
];
