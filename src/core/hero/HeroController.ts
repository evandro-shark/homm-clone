// HeroController.ts v1.0.0
import type { HeroData, Tile, ResourceNode, HexCoord } from '../../config/types'

export interface MoveResult {
  moved:             boolean
  resourceCollected: ResourceNode | null
}

export interface IHeroController {
  canAfford(hero: HeroData, cost: number): boolean
  move(hero: HeroData, map: Tile[][], to: HexCoord, cost: number, resources: ResourceNode[]): MoveResult
  endTurn(hero: HeroData): void
}

export class HeroController implements IHeroController {
  canAfford(hero: HeroData, cost: number): boolean {
    return hero.movesLeft >= cost
  }

  move(
    hero:      HeroData,
    _map:      Tile[][],
    to:        HexCoord,
    cost:      number,
    resources: ResourceNode[],
  ): MoveResult {
    if (!this.canAfford(hero, cost)) return { moved: false, resourceCollected: null }

    hero.col       = to.col
    hero.row       = to.row
    hero.movesLeft = Math.max(0, hero.movesLeft - cost)

    const collected = this.collectResource(hero, resources)
    return { moved: true, resourceCollected: collected }
  }

  endTurn(hero: HeroData): void {
    hero.movesLeft = hero.maxMoves
  }

  private collectResource(hero: HeroData, resources: ResourceNode[]): ResourceNode | null {
    const res = resources.find(r => !r.collected && r.col === hero.col && r.row === hero.row)
    if (!res) return null
    res.collected = true
    hero.resources[res.type] += res.amount
    return res
  }
}
