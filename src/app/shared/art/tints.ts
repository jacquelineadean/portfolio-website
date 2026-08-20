/**
 * The tile palette, in the order projects take it.
 *
 * One list rather than one per template: the card grid, the carousel and the
 * detail banner all colour the same project, and a project whose tile is blue
 * in one place and green in another stops reading as the same project.
 */
export const TILE_TINTS = ['blue', 'yellow', 'green', 'red', 'purple'] as const;

export type TileTint = (typeof TILE_TINTS)[number];

export function tintFor(index: number): TileTint {
  return TILE_TINTS[((index % TILE_TINTS.length) + TILE_TINTS.length) % TILE_TINTS.length];
}
