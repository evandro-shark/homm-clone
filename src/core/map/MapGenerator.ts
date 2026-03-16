// MapGenerator.ts v1.0.0
import type { Tile, TileType } from '../../config/types'

export interface IMapGenerator {
  generate(cols: number, rows: number): Tile[][]
}

const MOVE_COST: Record<TileType, number> = {
  road:     0.5,
  grass:    1,
  forest:   2,
  water:    Infinity,
  mountain: Infinity,
}

const WALKABLE: Record<TileType, boolean> = {
  road:     true,
  grass:    true,
  forest:   true,
  water:    false,
  mountain: false,
}

type ZoneMap = Partial<Record<TileType, Array<{ col: number; row: number }>>>

export class MapGenerator implements IMapGenerator {
  private zones: ZoneMap = {
    water:    [
      {col:5,row:3},{col:6,row:3},{col:5,row:4},{col:6,row:4},
      {col:14,row:8},{col:15,row:8},{col:14,row:9},
    ],
    mountain: [
      {col:10,row:2},{col:11,row:2},{col:10,row:3},
      {col:3,row:9},{col:4,row:9},{col:4,row:10},
    ],
    forest:   [
      {col:15,row:2},{col:16,row:2},{col:15,row:3},{col:16,row:3},
      {col:1,row:7},{col:2,row:7},{col:1,row:8},
      {col:8,row:9},{col:9,row:9},{col:8,row:10},
    ],
  }

  generate(cols: number, rows: number): Tile[][] {
    const map: Tile[][] = []
    for (let row = 0; row < rows; row++) {
      map[row] = []
      for (let col = 0; col < cols; col++) {
        const type = this.tileTypeAt(col, row)
        map[row][col] = {
          type,
          walkable:   WALKABLE[type],
          moveCost:   MOVE_COST[type],
          visibility: 'hidden',
        }
      }
    }
    return map
  }

  private tileTypeAt(col: number, row: number): TileType {
    for (const [type, list] of Object.entries(this.zones)) {
      if (list?.some(z => z.col === col && z.row === row))
        return type as TileType
    }
    return 'grass'
  }
}
