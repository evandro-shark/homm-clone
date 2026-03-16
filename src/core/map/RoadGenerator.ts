// RoadGenerator.ts v1.0.0
import type { Tile, HexCoord } from '../../config/types'
import { hexNeighbors } from '../../config/types'

export interface IRoadGenerator {
  apply(map: Tile[][], cols: number, rows: number, waypoints: HexCoord[]): void
}

export class RoadGenerator implements IRoadGenerator {
  // Conecta waypoints em sequência usando BFS, marcando tiles como 'road'
  apply(map: Tile[][], cols: number, rows: number, waypoints: HexCoord[]): void {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const path = this.bfs(map, cols, rows, waypoints[i], waypoints[i + 1])
      for (const { col, row } of path) {
        if (map[row][col].type === 'grass')
          map[row][col] = { ...map[row][col], type: 'road', moveCost: 0.5 }
      }
    }
  }

  private bfs(map: Tile[][], cols: number, rows: number, from: HexCoord, to: HexCoord): HexCoord[] {
    const key = (c: number, r: number) => `${c},${r}`
    const visited = new Map<string, HexCoord[]>([[key(from.col, from.row), []]])
    const queue: Array<{ coord: HexCoord; path: HexCoord[] }> = [{ coord: from, path: [] }]

    while (queue.length) {
      const { coord, path } = queue.shift()!
      for (const nb of hexNeighbors(coord.col, coord.row)) {
        if (nb.col < 0 || nb.col >= cols || nb.row < 0 || nb.row >= rows) continue
        if (!map[nb.row][nb.col].walkable) continue
        if (visited.has(key(nb.col, nb.row))) continue
        const newPath = [...path, nb]
        if (nb.col === to.col && nb.row === to.row) return newPath
        visited.set(key(nb.col, nb.row), newPath)
        queue.push({ coord: nb, path: newPath })
      }
    }
    return []
  }
}
