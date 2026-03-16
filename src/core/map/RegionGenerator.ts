// RegionGenerator.ts v1.0.0
import type { TileType } from '../../config/types'

export type RegionTileType = 'ground' | 'tree' | 'rock' | 'water' | 'path' | 'chest' | 'merchant'

export interface RegionTile {
  type:     RegionTileType
  walkable: boolean
  item?:    RegionItem
}

export interface RegionItem {
  kind:   'gold' | 'wood' | 'ore' | 'potion'
  amount: number
}

export interface RegionMap {
  tiles:  RegionTile[][]
  cols:   number
  rows:   number
  origin: TileType
}

export interface IRegionGenerator {
  generate(origin: TileType, seed: number): RegionMap
}

const COLS = 24
const ROWS = 18

// densidade de obstáculos e itens por tipo de tile de origem
const PROFILES: Record<TileType, {
  obstacle: RegionTileType
  obstacleDensity: number
  itemDensity: number
  items: RegionItem[]
}> = {
  grass: {
    obstacle:        'rock',
    obstacleDensity: 0.06,
    itemDensity:     0.04,
    items: [
      { kind: 'gold', amount: 100 },
      { kind: 'gold', amount: 200 },
      { kind: 'potion', amount: 1 },
    ],
  },
  forest: {
    obstacle:        'tree',
    obstacleDensity: 0.25,
    itemDensity:     0.05,
    items: [
      { kind: 'wood', amount: 5 },
      { kind: 'wood', amount: 10 },
      { kind: 'potion', amount: 1 },
    ],
  },
  road: {
    obstacle:        'rock',
    obstacleDensity: 0.03,
    itemDensity:     0.06,
    items: [
      { kind: 'gold', amount: 150 },
      { kind: 'potion', amount: 1 },
    ],
  },
  mountain: {
    obstacle:        'rock',
    obstacleDensity: 0.30,
    itemDensity:     0.04,
    items: [
      { kind: 'ore', amount: 5 },
      { kind: 'ore', amount: 10 },
    ],
  },
  water: {
    obstacle:        'rock',
    obstacleDensity: 0.05,
    itemDensity:     0.03,
    items: [
      { kind: 'gold', amount: 50 },
    ],
  },
}

export class RegionGenerator implements IRegionGenerator {
  generate(origin: TileType, seed: number): RegionMap {
    const rng   = this.makeRng(seed)
    const profile = PROFILES[origin]
    const tiles: RegionTile[][] = []

    for (let row = 0; row < ROWS; row++) {
      tiles[row] = []
      for (let col = 0; col < COLS; col++) {
        // borda sempre walkable (entrada/saída)
        if (row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1) {
          tiles[row][col] = { type: 'ground', walkable: true }
          continue
        }

        const r = rng()
        if (r < profile.obstacleDensity) {
          tiles[row][col] = { type: profile.obstacle, walkable: false }
        } else if (r < profile.obstacleDensity + profile.itemDensity) {
          const item = profile.items[Math.floor(rng() * profile.items.length)]
          tiles[row][col] = { type: 'chest', walkable: true, item: { ...item } }
        } else {
          tiles[row][col] = { type: 'ground', walkable: true }
        }
      }
    }

    // garante caminho central livre (entrada do herói)
    for (let row = 1; row < ROWS - 1; row++) tiles[row][1] = { type: 'ground', walkable: true }
    for (let col = 1; col < COLS - 1; col++) tiles[1][col] = { type: 'ground', walkable: true }

    return { tiles, cols: COLS, rows: ROWS, origin }
  }

  private makeRng(seed: number): () => number {
    let s = seed
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff
      return (s >>> 0) / 0xffffffff
    }
  }
}
