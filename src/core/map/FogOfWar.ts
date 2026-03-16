// FogOfWar.ts v1.0.0
import type { Tile, HexCoord } from '../../config/types'
import { hexNeighbors } from '../../config/types'

export interface IFogOfWar {
  reveal(map: Tile[][], cols: number, rows: number, origin: HexCoord, radius: number): void
  obscure(map: Tile[][], cols: number, rows: number): void
}

export class FogOfWar implements IFogOfWar {
  // Revela hexes dentro do raio, respeitando bloqueio por floresta
  reveal(map: Tile[][], cols: number, rows: number, origin: HexCoord, radius: number): void {
    this.obscure(map, cols, rows)

    const key = (c: number, r: number) => `${c},${r}`
    // BFS com custo — floresta bloqueia visão além dela
    const visited = new Map<string, number>([[key(origin.col, origin.row), 0]])
    const queue: Array<{ coord: HexCoord; cost: number }> = [{ coord: origin, cost: 0 }]

    while (queue.length) {
      const { coord, cost } = queue.shift()!
      const tile = map[coord.row][coord.col]

      if (cost <= radius) {
        tile.visibility = 'visible'
      }

      // floresta bloqueia visão além dela
      if (tile.type === 'forest' && cost > 0) continue
      if (cost >= radius) continue

      for (const nb of hexNeighbors(coord.col, coord.row)) {
        if (nb.col < 0 || nb.col >= cols || nb.row < 0 || nb.row >= rows) continue
        const k = key(nb.col, nb.row)
        const nextCost = cost + 1
        if (visited.has(k)) continue
        visited.set(k, nextCost)
        queue.push({ coord: nb, cost: nextCost })
      }
    }
  }

  // Tiles visíveis voltam para 'explored' (já visto mas fora do raio atual)
  obscure(map: Tile[][], cols: number, rows: number): void {
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++)
        if (map[row][col].visibility === 'visible')
          map[row][col].visibility = 'explored'
  }
}
