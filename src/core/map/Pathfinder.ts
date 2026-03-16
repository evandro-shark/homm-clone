// Pathfinder.ts v1.0.0 — Dijkstra com custo de movimento por tile
import type { Tile, HexCoord } from '../../config/types'
import { hexNeighbors } from '../../config/types'

export interface PathResult {
  path:      HexCoord[]
  totalCost: number
}

export interface IPathfinder {
  find(map: Tile[][], cols: number, rows: number, from: HexCoord, to: HexCoord): PathResult
}

export class Pathfinder implements IPathfinder {
  find(map: Tile[][], cols: number, rows: number, from: HexCoord, to: HexCoord): PathResult {
    const key = (c: number, r: number) => `${c},${r}`

    const dist  = new Map<string, number>([[key(from.col, from.row), 0]])
    const prev  = new Map<string, HexCoord>()
    // min-heap simples com array ordenado
    const queue: Array<{ coord: HexCoord; cost: number }> = [{ coord: from, cost: 0 }]

    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost)
      const { coord, cost } = queue.shift()!
      const k = key(coord.col, coord.row)

      if (coord.col === to.col && coord.row === to.row) {
        return { path: this.buildPath(prev, from, to), totalCost: cost }
      }

      for (const nb of hexNeighbors(coord.col, coord.row)) {
        if (nb.col < 0 || nb.col >= cols || nb.row < 0 || nb.row >= rows) continue
        const tile = map[nb.row][nb.col]
        if (!tile.walkable) continue

        const nbKey   = key(nb.col, nb.row)
        const newCost = cost + tile.moveCost
        if (newCost < (dist.get(nbKey) ?? Infinity)) {
          dist.set(nbKey, newCost)
          prev.set(nbKey, coord)
          queue.push({ coord: nb, cost: newCost })
        }
      }

      dist.set(k, cost) // marca como finalizado
    }

    return { path: [], totalCost: Infinity }
  }

  private buildPath(prev: Map<string, HexCoord>, from: HexCoord, to: HexCoord): HexCoord[] {
    const key  = (c: number, r: number) => `${c},${r}`
    const path: HexCoord[] = []
    let   cur: HexCoord | undefined = to

    while (cur && !(cur.col === from.col && cur.row === from.row)) {
      path.unshift(cur)
      cur = prev.get(key(cur.col, cur.row))
    }
    return path
  }
}
