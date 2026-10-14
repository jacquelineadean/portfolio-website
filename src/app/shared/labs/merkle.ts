/**
 * Merkle-tree comparison of two copies of a table, for the About page's lab.
 *
 * The scenario is a backfill check: a legacy table and its migrated copy
 * should hold the same 1,024 rows. Each copy is hashed in 16 ranges of 64 rows,
 * and the range hashes are hashed in pairs up to one root. Equal roots mean
 * equal copies, barring a hash collision, after one comparison. Unequal roots send the check down only
 * the branches whose hashes differ, so k bad rows cost about 2k log2(16) hash
 * comparisons plus k range scans, against 1,024 row comparisons for a full scan.
 *
 * Cassandra's repair and Amazon's Dynamo compare replicas the same way.
 */

export const ROWS = 1024;
export const LEAVES = 16;
export const ROWS_PER_LEAF = ROWS / LEAVES;
/** Tree depth below the root: 16 leaves sit 4 levels down. */
export const DEPTH = Math.log2(LEAVES);

export interface Row {
  id: number;
  name: string;
  amount: string;
  updatedAt: string;
}

/** What went wrong with a row in the migrated copy. */
export type Fault = 'encoding' | 'rounding' | 'timezone';

export interface Corruption {
  row: number;
  fault: Fault;
  column: keyof Row;
  legacy: string;
  migrated: string;
}

/**
 * Nodes are heap-indexed: the root is 1, node i has children 2i and 2i + 1,
 * and the leaves are LEAVES to 2 * LEAVES - 1. Index 0 is unused.
 */
export type Tree = string[];

export interface Step {
  node: number;
  match: boolean;
}

export interface DiffResult {
  /** Hash comparisons, in the order a breadth-first descent makes them. */
  steps: Step[];
  /** Leaves whose hashes differ: the ranges to scan row by row. */
  leaves: number[];
  /** Rows that differ, found by scanning those ranges. */
  rows: number[];
}

const NAMES = ['Zoë', 'José', 'Søren', 'Chloé', 'Ana', 'Wei', 'Priya', 'Kofi', 'Renée', 'Björn'];

/** The legacy table: deterministic, so both copies and the tests agree. */
export function legacyRows(): Row[] {
  return Array.from({ length: ROWS }, (_, id) => {
    const cents = ((id * 7919) % 50000) + 99;
    const day = 1 + (id % 28);
    const hour = (id * 5) % 24;
    return {
      id,
      name: NAMES[id % NAMES.length],
      amount: (cents / 100).toFixed(2),
      updatedAt: `2026-03-${pad(day)} ${pad(hour)}:${pad((id * 13) % 60)}`,
    };
  });
}

/**
 * The fault a given row gets when corrupted. Each is a real migration bug:
 * UTF-8 bytes decoded as Latin-1, a decimal read through a float and
 * truncated, and a timestamp converted from local time as if it were UTC.
 */
export function corrupt(row: Row): Corruption {
  if (/[^\x00-\x7f]/.test(row.name)) {
    return {
      row: row.id,
      fault: 'encoding',
      column: 'name',
      legacy: row.name,
      migrated: mojibake(row.name),
    };
  }
  if (row.id % 2 === 0) {
    const cents = Math.round(Number(row.amount) * 100) - 1;
    return {
      row: row.id,
      fault: 'rounding',
      column: 'amount',
      legacy: row.amount,
      migrated: (cents / 100).toFixed(2),
    };
  }
  // Local time at UTC-5 written as if it were UTC: five hours later, and past
  // midnight onto the next day. Days only run to the 28th, so no month rolls.
  const [date, time] = row.updatedAt.split(' ');
  const [h, m] = time.split(':').map(Number);
  const day = Number(date.slice(-2)) + (h + 5 >= 24 ? 1 : 0);
  return {
    row: row.id,
    fault: 'timezone',
    column: 'updatedAt',
    legacy: row.updatedAt,
    migrated: `${date.slice(0, -2)}${pad(day)} ${pad((h + 5) % 24)}:${pad(m)}`,
  };
}

/** The migrated copy: the legacy rows with the given corruptions applied. */
export function migratedRows(legacy: Row[], corruptions: Corruption[]): Row[] {
  const byRow = new Map(corruptions.map((c) => [c.row, c]));
  return legacy.map((row) => {
    const c = byRow.get(row.id);
    return c ? { ...row, [c.column]: c.migrated } : row;
  });
}

export function buildTree(rows: Row[]): Tree {
  const tree: Tree = new Array(2 * LEAVES).fill('');
  for (let leaf = 0; leaf < LEAVES; leaf++) {
    const slice = rows.slice(leaf * ROWS_PER_LEAF, (leaf + 1) * ROWS_PER_LEAF);
    tree[LEAVES + leaf] = fnv1a(slice.map(serialize).join('\n'));
  }
  for (let node = LEAVES - 1; node >= 1; node--) {
    tree[node] = fnv1a(tree[2 * node] + tree[2 * node + 1]);
  }
  return tree;
}

/** Breadth-first: compare a node; descend into its children only on a mismatch. */
export function diff(a: Tree, b: Tree, rowsA: Row[], rowsB: Row[]): DiffResult {
  const steps: Step[] = [];
  const leaves: number[] = [];
  let frontier = [1];
  while (frontier.length) {
    const next: number[] = [];
    for (const node of frontier) {
      const match = a[node] === b[node];
      steps.push({ node, match });
      if (match) continue;
      if (node >= LEAVES) leaves.push(node);
      else next.push(2 * node, 2 * node + 1);
    }
    frontier = next;
  }
  const rows: number[] = [];
  for (const leaf of leaves) {
    const first = (leaf - LEAVES) * ROWS_PER_LEAF;
    for (let id = first; id < first + ROWS_PER_LEAF; id++) {
      if (serialize(rowsA[id]) !== serialize(rowsB[id])) rows.push(id);
    }
  }
  return { steps, leaves, rows };
}

/** First and last row id a node covers. */
export function rangeOf(node: number): [number, number] {
  const level = Math.floor(Math.log2(node));
  const span = ROWS >> level;
  const first = (node - (1 << level)) * span;
  return [first, first + span - 1];
}

export function serialize(row: Row): string {
  return `${row.id}|${row.name}|${row.amount}|${row.updatedAt}`;
}

/** 32-bit FNV-1a over UTF-16 code units, as 8 hex digits. Enough to tell copies apart here. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** UTF-8 bytes read back as Latin-1: "Zoë" becomes "ZoÃ«". */
function mojibake(text: string): string {
  return Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join('');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
