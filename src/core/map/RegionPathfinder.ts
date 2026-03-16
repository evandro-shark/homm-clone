// RegionPathfinder.ts v1.0.0 — A* para grid quadrado
import type { RegionTile } from './RegionGenerator'

export interface GridCoord {
  col: number
  row: number
}

export interface IRegionPathfinder {
  find(tiles: RegionTile[][], cols: number, rows: number, from: GridCoord, to: GridCoord): GridCoord[]
}

export class RegionPathfinder implements IRegionPathfinder {
  find(tiles: RegionTile[][], cols: number, rows: number, from: GridCoord, to: GridCoord): GridCoord[] {
    const key  = (c: number, r: number) => `${c},${r}`
    const h    = (c: number, r: number) => Math.abs(c - to.col) + Math.abs(r - to.row)

    const gScore = new Map<string, number>([[key(from.col, from.row), 0]])
    const fScore = new Map<string, number>([[key(from.col, from.row), h(from.col, from.row)]])
    const prev   = new Map<string, GridCoord>()
    const open   = new Set<string>([key(from.col, from.row)])
    const closed = new Set<string>()

    while (open.size) {
      // pega o nó com menor fScore no open set
      let cur!: GridCoord
      let best = Infinity
      for (const k of open) {
        const f = fScore.get(k) ?? Infinity
        if (f < best) { best = f; const [c, r] = k.split(',').map(Number); cur = { col: c, row: r } }
      }

      if (cur.col === to.col && cur.row === to.row)
        return this.buildPath(prev, from, to)

      const curKey = key(cur.col, cur.row)
      open.delete(curKey)
      closed.add(curKey)

      for (const nb of this.neighbors(cur.col, cur.row, cols, rows)) {
        if (!tiles[nb.row][nb.col].walkable) continue
        const nbKey = key(nb.col, nb.row)
        if (closed.has(nbKey)) continue

        const tentative = (gScore.get(curKey) ?? Infinity) + 1
        if (tentative < (gScore.get(nbKey) ?? Infinity)) {
          prev.set(nbKey, cur)
          gScore.set(nbKey, tentative)
          fScore.set(nbKey, tentative + h(nb.col, nb.row))
          open.add(nbKey)
        }
      }
    }
    return []
  }

  private neighbors(col: number, row: number, cols: number, rows: number): GridCoord[] {
    return [
      { col: col + 1, row },
      { col: col - 1, row },
      { col, row: row + 1 },
      { col, row: row - 1 },
      { col: col + 1, row: row + 1 },
      { col: col - 1, row: row - 1 },
      { col: col + 1, row: row - 1 },
      { col: col - 1, row: row + 1 },
    ].filter(n => n.col >= 0 && n.col < cols && n.row >= 0 && n.row < rows)
  }

  private buildPath(prev: Map<string, GridCoord>, from: GridCoord, to: GridCoord): GridCoord[] {
    const key  = (c: number, r: number) => `${c},${r}`
    const path: GridCoord[] = []
    let   cur: GridCoord | undefined = to
    while (cur && !(cur.col === from.col && cur.row === from.row)) {
      path.unshift(cur)
      cur = prev.get(key(cur.col, cur.row))
    }
    return path
  }
}
