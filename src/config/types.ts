// types.ts v1.0.0

export type TileType = 'grass' | 'water' | 'mountain' | 'forest' | 'road'

export type Visibility = 'hidden' | 'explored' | 'visible'

export interface Tile {
  type:       TileType
  walkable:   boolean
  moveCost:   number
  visibility: Visibility
}

export interface ResourceNode {
  col:       number
  row:       number
  type:      ResourceType
  amount:    number
  collected: boolean
}

export type ResourceType = 'gold' | 'wood' | 'ore'

export interface Resources {
  gold: number
  wood: number
  ore:  number
}

export interface HeroData {
  col:       number
  row:       number
  movesLeft: number
  maxMoves:  number
  resources: Resources
}

export type CityType = 'castle' | 'rampart' | 'tower'

export interface ICity {
  id:       string
  name:     string
  type:     CityType
  col:      number
  row:      number
  owner:    'player' | 'enemy' | 'neutral'
  buildings: string[] // Futuro: interface IBuilding[]
}

export interface HexCoord {
  col: number
  row: number
}

// --- Hex math utils ---

export function hexToPixel(col: number, row: number, size: number): { x: number; y: number } {
  const x = size * (3 / 2) * col
  const y = size * Math.sqrt(3) * (row + (col % 2 !== 0 ? 0.5 : 0))
  return { x, y }
}

export function hexNeighbors(col: number, row: number): HexCoord[] {
  const isOdd = col % 2 !== 0
  return [
    { col: col + 1, row: isOdd ? row + 1 : row },
    { col: col + 1, row: isOdd ? row     : row - 1 },
    { col: col,     row: row - 1 },
    { col: col - 1, row: isOdd ? row     : row - 1 },
    { col: col - 1, row: isOdd ? row + 1 : row },
    { col: col,     row: row + 1 },
  ]
}
