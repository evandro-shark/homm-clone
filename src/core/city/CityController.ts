// CityController.ts v1.0.0
import type { ICity, CityType, Resources } from '../../config/types'

export interface ICityController {
  cities: ICity[]
  foundCity(name: string, type: CityType, col: number, row: number, owner: 'player' | 'enemy' | 'neutral'): ICity | null
  getCityAt(col: number, row: number): ICity | undefined
  canFoundCity(col: number, row: number, currentResources: Resources): { can: boolean; reason?: string }
}

export class CityController implements ICityController {
  public cities: ICity[] = []

  // Custos base para fundar uma cidade (Exemplo conforme planejado)
  private FOUND_COST: Resources = {
    gold: 0,
    wood: 10,
    ore: 10
  }

  constructor(initialCities: ICity[] = []) {
    this.cities = initialCities
  }

  public canFoundCity(col: number, row: number, currentResources: Resources): { can: boolean; reason?: string } {
    // 1. Verificar se já existe uma cidade no local
    if (this.getCityAt(col, row)) {
      return { can: false, reason: 'Já existe uma cidade neste local.' }
    }

    // 2. Verificar se o jogador tem recursos suficientes
    if (currentResources.wood < this.FOUND_COST.wood || currentResources.ore < this.FOUND_COST.ore) {
      return { can: false, reason: `Recursos insuficientes. Necessário: ${this.FOUND_COST.wood} madeira e ${this.FOUND_COST.ore} minério.` }
    }

    return { can: true }
  }

  public foundCity(name: string, type: CityType, col: number, row: number, owner: 'player' | 'enemy' | 'neutral'): ICity | null {
    const newCity: ICity = {
      id: `city_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name,
      type,
      col,
      row,
      owner,
      buildings: ['hall'] // Toda cidade começa com um prédio básico
    }

    this.cities.push(newCity)
    return newCity
  }

  public getCityAt(col: number, row: number): ICity | undefined {
    return this.cities.find(c => c.col === col && c.row === row)
  }

  public getFoundCost(): Resources {
    return { ...this.FOUND_COST }
  }
}
