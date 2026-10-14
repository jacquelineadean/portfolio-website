import {
  DEPTH,
  LEAVES,
  ROWS,
  ROWS_PER_LEAF,
  buildTree,
  corrupt,
  diff,
  legacyRows,
  migratedRows,
  rangeOf,
} from './merkle';

describe('merkle', () => {
  const legacy = legacyRows();
  const legacyTree = buildTree(legacy);

  function run(rowIds: number[]) {
    const migrated = migratedRows(
      legacy,
      rowIds.map((id) => corrupt(legacy[id])),
    );
    return diff(legacyTree, buildTree(migrated), legacy, migrated);
  }

  it('proves identical copies equal with one comparison', () => {
    const result = run([]);
    expect(result.steps).toEqual([{ node: 1, match: true }]);
    expect(result.leaves).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('finds one bad row with 2 comparisons per level below the root', () => {
    const result = run([517]);
    expect(result.steps.length).toBe(1 + 2 * DEPTH);
    expect(result.leaves).toEqual([LEAVES + Math.floor(517 / ROWS_PER_LEAF)]);
    expect(result.rows).toEqual([517]);
  });

  it('finds every bad row and scans only the ranges that hold them', () => {
    const bad = [3, 4, 700, 1023];
    const result = run(bad);
    expect(result.rows).toEqual(bad);
    expect(result.leaves.length).toBe(3);
    expect(result.leaves.length * ROWS_PER_LEAF).toBeLessThan(ROWS);
  });

  it('applies one realistic fault per row', () => {
    expect(corrupt(legacy[0]).fault).toBe('encoding');
    expect(corrupt(legacy[0]).migrated).toBe('ZoÃ«');
    const rounding = corrupt(legacy[4]);
    expect(rounding.fault).toBe('rounding');
    expect(Number(rounding.legacy) - Number(rounding.migrated)).toBeCloseTo(0.01);
    expect(corrupt(legacy[5]).fault).toBe('timezone');
  });

  it('maps nodes to the row ranges they cover', () => {
    expect(rangeOf(1)).toEqual([0, ROWS - 1]);
    expect(rangeOf(2)).toEqual([0, ROWS / 2 - 1]);
    expect(rangeOf(3)).toEqual([ROWS / 2, ROWS - 1]);
    expect(rangeOf(LEAVES)).toEqual([0, ROWS_PER_LEAF - 1]);
    expect(rangeOf(2 * LEAVES - 1)).toEqual([ROWS - ROWS_PER_LEAF, ROWS - 1]);
  });
});
