import {
  Grid,
  SLOW_COST,
  WALL,
  makeGrid,
  manhattan,
  neighbours,
  reachable,
  search,
} from './pathfinding';

const SEEDS = ['hero', 'a', 'b', 'c', 'd', 'e', 'f', 'g'];
const SIZES: [number, number][] = [
  [44, 18],
  [22, 21],
];

function pathCost(grid: Grid, path: number[]): number {
  return path.slice(1).reduce((sum, cell) => sum + grid.cost[cell], 0);
}

describe('pathfinding', () => {
  for (const [cols, rows] of SIZES) {
    for (const seed of SEEDS) {
      describe(`${cols}x${rows} map "${seed}"`, () => {
        const grid = makeGrid(cols, rows, seed);
        const dijkstra = search(grid, 'dijkstra');
        const astar = search(grid, 'astar');
        const greedy = search(grid, 'greedy');

        it('has a reachable goal', () => {
          expect(reachable(grid, grid.start)[grid.goal]).toBe(1);
          expect(dijkstra.path.length).toBeGreaterThan(1);
        });

        it('returns contiguous paths through open cells, priced correctly', () => {
          for (const result of [dijkstra, astar, greedy]) {
            expect(result.path[0]).toBe(grid.start);
            expect(result.path.at(-1)).toBe(grid.goal);
            for (let i = 1; i < result.path.length; i++) {
              expect(grid.cost[result.path[i]]).not.toBe(WALL);
              expect(neighbours(grid, result.path[i - 1])).toContain(result.path[i]);
            }
            expect(result.cost).toBe(pathCost(grid, result.path));
          }
        });

        it('A* matches Dijkstra on cost and expands no more cells', () => {
          expect(astar.cost).toBe(dijkstra.cost);
          expect(astar.order.length).toBeLessThanOrEqual(dijkstra.order.length);
        });

        it('greedy never beats the optimum', () => {
          expect(greedy.cost).toBeGreaterThanOrEqual(dijkstra.cost);
        });

        it('records each expansion once, after the cell joined the frontier', () => {
          expect(new Set(dijkstra.order).size).toBe(dijkstra.order.length);
          dijkstra.order.forEach((cell, i) => {
            expect(dijkstra.expandedAt[cell]).toBe(i);
            expect(dijkstra.pushedAt[cell]).toBeLessThanOrEqual(i);
          });
        });
      });
    }
  }

  it('routes around slow ground when the detour is cheaper', () => {
    // 5 x 3, start top-left, goal top-right. Straight across costs 3 slow cells
    // plus the goal: 16. Down, along the bottom row and back up costs 8.
    const S = SLOW_COST;
    const W = WALL;
    const grid: Grid = {
      cols: 5,
      rows: 3,
      cost: new Uint8Array([1, S, S, S, 1, 1, W, W, W, 1, 1, 1, 1, 1, 1]),
      start: 0,
      goal: 4,
    };
    expect(search(grid, 'dijkstra').cost).toBe(8);
    expect(search(grid, 'astar').cost).toBe(8);
    // Greedy takes the straight row, because every slow cell is nearer the goal.
    expect(search(grid, 'greedy').cost).toBe(3 * S + 1);
    expect(manhattan(grid, 0, 4)).toBe(4);
  });

  it('reports an enclosed goal as unreachable after exhausting the reachable cells', () => {
    const cost = new Uint8Array([1, 1, WALL, 1, 1, 1, WALL, 1, 1, 1, WALL, 1]);
    const grid: Grid = { cols: 4, rows: 3, cost, start: 0, goal: 3 };
    const result = search(grid, 'astar');
    expect(result.path).toEqual([]);
    expect(result.cost).toBe(Infinity);
    expect(result.order.length).toBe(6);
  });
});
