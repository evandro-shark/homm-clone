// AdventureMapScene.ts v1.1.0
import Phaser from 'phaser'
import type { Tile, TileType, ResourceNode, HeroData, HexCoord, Resources, CityType, ICity } from '../config/types'
import { hexToPixel } from '../config/types'
import { MapGenerator }   from '../core/map/MapGenerator'
import { RoadGenerator }  from '../core/map/RoadGenerator'
import { FogOfWar }       from '../core/map/FogOfWar'
import { Pathfinder }     from '../core/map/Pathfinder'
import { HeroController } from '../core/hero/HeroController'
import { CityController } from '../core/city/CityController'

const HEX_SIZE  = 40
const MAP_COLS  = 18
const MAP_ROWS  = 12
const FOG_RADIUS = 3

const TILE_COLORS: Record<TileType, number> = {
  grass:    0x4a7c59,
  water:    0x1a6b8a,
  mountain: 0x7a6a5a,
  forest:   0x2d5a27,
  road:     0xc8a84b,
}

const RESOURCE_COLORS: Record<string, number> = {
  gold: 0xffd700,
  wood: 0x8b4513,
  ore:  0x808080,
}

// Waypoints para geração de estradas (conecta cidades e pontos de interesse)
const ROAD_WAYPOINTS: HexCoord[] = [
  { col: 1,  row: 1  },
  { col: 4,  row: 3  },
  { col: 7,  row: 2  },
  { col: 9,  row: 5  },
  { col: 12, row: 4  },
  { col: 16, row: 6  },
  { col: 17, row: 10 },
]

export class AdventureMapScene extends Phaser.Scene {
  // --- modules ---
  private mapGen    = new MapGenerator()
  private roadGen   = new RoadGenerator()
  private fog       = new FogOfWar()
  private pathfinder = new Pathfinder()
  private heroCtrl  = new HeroController()
  private cityCtrl  = new CityController()

  // --- state ---
  private map:           Tile[][] = []
  private resourceNodes: ResourceNode[] = []
  private hero!:         HeroData
  private isMoving =     false

  // --- graphics ---
  private mapGraphics!:       Phaser.GameObjects.Graphics
  private cityGraphics!:      Phaser.GameObjects.Graphics
  private resourceGraphics!:  Phaser.GameObjects.Graphics
  private fogGraphics!:       Phaser.GameObjects.Graphics
  private highlightGraphics!: Phaser.GameObjects.Graphics
  private heroSprite!:        Phaser.GameObjects.Container
  private hudIcons!:          Phaser.GameObjects.Graphics
  private hudResourceTexts:   Phaser.GameObjects.Text[] = []
  private movesBar!:          Phaser.GameObjects.Graphics
  private movesLabel!:        Phaser.GameObjects.Text
  private turnText!:          Phaser.GameObjects.Text
  private turnCount =         1

  constructor() { super({ key: 'AdventureMapScene' }) }

  create(data?: { resources?: Resources; heroCol?: number; heroRow?: number }) {
    this.map           = this.mapGen.generate(MAP_COLS, MAP_ROWS)
    this.roadGen.apply(this.map, MAP_COLS, MAP_ROWS, ROAD_WAYPOINTS)
    this.resourceNodes = this.buildResources()
    this.hero          = {
      col:       data?.heroCol  ?? 1,
      row:       data?.heroRow  ?? 1,
      movesLeft: 10,
      maxMoves:  10,
      resources: data?.resources ?? { gold: 0, wood: 0, ore: 0 },
    }

    this.mapGraphics       = this.add.graphics()
    this.cityGraphics      = this.add.graphics().setDepth(4)
    this.resourceGraphics  = this.add.graphics().setDepth(5)
    this.highlightGraphics = this.add.graphics().setDepth(8)
    this.fogGraphics       = this.add.graphics().setDepth(15)

    this.drawMap()
    this.drawCities()
    this.drawResources()
    this.drawHero()
    this.createHUD()
    this.setupInput()
    this.setupMouseInput()

    // Revela área inicial ao redor do herói
    this.fog.reveal(this.map, MAP_COLS, MAP_ROWS, { col: this.hero.col, row: this.hero.row }, FOG_RADIUS)
    this.drawFog()
  }

  // --- MAP DRAW ---

  private drawMap() {
    this.mapGraphics.clear()
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = this.map[row][col]
        const { x, y } = hexToPixel(col, row, HEX_SIZE)
        const pts = this.hexPoints(x + HEX_SIZE, y + HEX_SIZE)
        this.mapGraphics.fillStyle(TILE_COLORS[tile.type])
        this.mapGraphics.fillPoints(pts, true)
        this.mapGraphics.lineStyle(1, 0x000000, 0.2)
        this.mapGraphics.strokePoints(pts, true)
      }
    }
  }

  private drawCities() {
    this.cityGraphics.clear()
    for (const city of this.cityCtrl.cities) {
      const tile = this.map[city.row][city.col]
      if (tile.visibility === 'hidden') continue

      const { x, y } = hexToPixel(city.col, city.row, HEX_SIZE)
      const alpha = tile.visibility === 'explored' ? 0.4 : 1.0

      // Desenha um "castelo" simples
      this.cityGraphics.fillStyle(0xdddddd, alpha)
      this.cityGraphics.fillRect(x + HEX_SIZE - 15, y + HEX_SIZE - 15, 30, 30)
      this.cityGraphics.fillStyle(0x888888, alpha)
      this.cityGraphics.fillRect(x + HEX_SIZE - 20, y + HEX_SIZE + 5, 40, 10)
      this.cityGraphics.fillStyle(0xcc0000, alpha)
      this.cityGraphics.fillTriangle(
        x + HEX_SIZE - 15, y + HEX_SIZE - 15,
        x + HEX_SIZE + 15, y + HEX_SIZE - 15,
        x + HEX_SIZE,      y + HEX_SIZE - 30
      )

      // Nome da cidade
      const name = this.add.text(x + HEX_SIZE, y + HEX_SIZE + 25, city.name, {
        fontSize: '10px', color: '#ffffff', fontFamily: 'monospace',
        backgroundColor: '#000000aa'
      }).setOrigin(0.5).setDepth(6)
      if (tile.visibility === 'explored') name.setAlpha(0.4)
    }
  }

  private drawFog() {
    this.fogGraphics.clear()
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const { visibility } = this.map[row][col]
        if (visibility === 'visible') continue
        const { x, y } = hexToPixel(col, row, HEX_SIZE)
        const pts = this.hexPoints(x + HEX_SIZE, y + HEX_SIZE)
        const alpha = visibility === 'hidden' ? 0.5 : 0.25
        this.fogGraphics.fillStyle(0x000000, alpha)
        this.fogGraphics.fillPoints(pts, true)
      }
    }
  }

  private drawResources() {
    this.resourceGraphics.clear()
    for (const res of this.resourceNodes) {
      const tile = this.map[res.row]?.[res.col]
      if (!tile || tile.visibility === 'hidden') continue

      const { x, y } = hexToPixel(res.col, res.row, HEX_SIZE)
      let alpha = tile.visibility === 'explored' ? 0.4 : 1.0
      let color = RESOURCE_COLORS[res.type]

      if (res.collected) {
        color = 0x555555 // Cinza para indicar que foi coletado
        alpha = 0.3
      }

      this.resourceGraphics.fillStyle(color, alpha)
      this.resourceGraphics.fillCircle(x + HEX_SIZE, y + HEX_SIZE, 10)
      this.resourceGraphics.lineStyle(2, 0xffffff, alpha * 0.5)
      this.resourceGraphics.strokeCircle(x + HEX_SIZE, y + HEX_SIZE, 10)
    }
  }

  private drawHero() {
    const { x, y } = hexToPixel(this.hero.col, this.hero.row, HEX_SIZE)
    const g = this.add.graphics()
    g.fillStyle(0x4169e1)
    g.fillTriangle(0, -18, -12, 12, 12, 12)
    g.fillStyle(0xffd700)
    g.fillCircle(0, -20, 5)
    this.heroSprite = this.add.container(x + HEX_SIZE, y + HEX_SIZE, [g])
    this.heroSprite.setDepth(20)
  }

  private drawHighlight(path: HexCoord[], reachable: boolean) {
    this.highlightGraphics.clear()
    const color = reachable ? 0xffffff : 0xff4444
    for (const { col, row } of path) {
      const { x, y } = hexToPixel(col, row, HEX_SIZE)
      const pts = this.hexPoints(x + HEX_SIZE, y + HEX_SIZE)
      this.highlightGraphics.fillStyle(color, 0.2)
      this.highlightGraphics.fillPoints(pts, true)
      this.highlightGraphics.lineStyle(2, color, 0.8)
      this.highlightGraphics.strokePoints(pts, true)
    }
  }

  // --- HUD ---

  private createHUD() {
    const cam  = this.cameras.main
    const hudY = cam.height - 58

    const bg = this.add.graphics().setDepth(30)
    bg.fillStyle(0x111111, 0.92)
    bg.fillRect(0, hudY, cam.width, 58)
    bg.lineStyle(1, 0x444444, 1)
    bg.lineBetween(0, hudY, cam.width, hudY)

    // ícones + valores de recursos
    this.hudIcons = this.add.graphics().setDepth(31)
    const resDefs: Array<{ label: string; color: number }> = [
      { label: 'Gold', color: 0xffd700 },
      { label: 'Wood', color: 0x8b4513 },
      { label: 'Ore',  color: 0x9e9e9e },
    ]
    this.hudResourceTexts = resDefs.map(({ label, color }, i) => {
      const x = 14 + i * 130
      this.hudIcons.fillStyle(color)
      this.hudIcons.fillCircle(x + 8, hudY + 14, 7)
      this.hudIcons.lineStyle(1, 0xffffff, 0.4)
      this.hudIcons.strokeCircle(x + 8, hudY + 14, 7)
      return this.add.text(x + 20, hudY + 6, `${label}: 0`, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'monospace',
      }).setDepth(31)
    })

    // progress bar de movimentos
    this.movesBar   = this.add.graphics().setDepth(31)
    this.movesLabel = this.add.text(14, hudY + 30, '', {
      fontSize: '12px', color: '#ffdd57', fontFamily: 'monospace',
    }).setDepth(31)

    // turno fixo no canto direito
    this.turnText = this.add.text(cam.width - 10, hudY + 6, '', {
      fontSize: '14px', color: '#aaffaa', fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(31)

    // hints
    this.add.text(cam.width - 10, hudY + 30,
      '[Q/W/E/A/S/D] mover   [B] Fundar   [SPACE] turno   [Mouse] clicar', {
        fontSize: '11px', color: '#555555', fontFamily: 'monospace',
      }).setOrigin(1, 0).setDepth(31)

    this.updateHUD()
  }

  private updateHUD() {
    const { gold, wood, ore } = this.hero.resources
    const vals = [gold, wood, ore]
    const labels = ['Gold', 'Wood', 'Ore']
    this.hudResourceTexts.forEach((t, i) => t.setText(`${labels[i]}: ${vals[i]}`))

    const cam      = this.cameras.main
    const hudY     = cam.height - 58
    const barX     = 14
    const barY     = hudY + 33
    const barW     = 210
    const ratio    = Math.max(0, this.hero.movesLeft / this.hero.maxMoves)
    const filled   = Math.round(barW * ratio)
    const barColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xffaa00 : 0xff4444

    this.movesBar.clear()
    this.movesBar.fillStyle(0x333333)
    this.movesBar.fillRoundedRect(barX, barY, barW, 10, 4)
    if (filled > 0) {
      this.movesBar.fillStyle(barColor)
      this.movesBar.fillRoundedRect(barX, barY, filled, 10, 4)
    }
    this.movesBar.lineStyle(1, 0x555555)
    this.movesBar.strokeRoundedRect(barX, barY, barW, 10, 4)

    this.movesLabel.setText(`Mov: ${this.hero.movesLeft.toFixed(1)}/${this.hero.maxMoves}`)
    this.turnText.setText(`Turno: ${this.turnCount}`)
  }

  // --- INPUT ---

  private setupInput() {
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (this.isMoving) return
      if (e.key === ' ') { this.endTurn(); return }
      if (e.key.toLowerCase() === 'b') { this.tryFoundCity(); return }

      // mapeia tecla → vizinho pelo índice da direção hex
      const keyMap: Record<string, number> = {
        e: 0, w: 1, q: 2, a: 3, s: 4, d: 5,
      }
      const idx = keyMap[e.key]
      if (idx === undefined) return

      const { col, row } = this.hero
      const isOdd = col % 2 !== 0
      const dirs: HexCoord[] = [
        { col: col + 1, row: isOdd ? row + 1 : row },
        { col: col + 1, row: isOdd ? row     : row - 1 },
        { col: col,     row: row - 1 },
        { col: col - 1, row: isOdd ? row     : row - 1 },
        { col: col - 1, row: isOdd ? row + 1 : row },
        { col: col,     row: row + 1 },
      ]
      const target = dirs[idx]
      if (!target) return
      if (target.col < 0 || target.col >= MAP_COLS || target.row < 0 || target.row >= MAP_ROWS) return
      const tile = this.map[target.row][target.col]
      if (!tile.walkable) return
      this.executeMove(target, tile.moveCost)
    })
  }

  private tryFoundCity() {
    const { col, row, resources } = this.hero
    const tile = this.map[row][col]

    // 1. Verificar se é terreno de grama (conforme diretriz)
    if (tile.type !== 'grass') {
      this.showMessage('Cidades só podem ser fundadas na grama!')
      return
    }

    // 2. Verificar se há recursos no local
    const hasResource = this.resourceNodes.some(r => r.col === col && r.row === row && !r.collected)
    if (hasResource) {
      this.showMessage('Local ocupado por recursos!')
      return
    }

    // 3. Verificar lógica do controller (recursos e espaço)
    const check = this.cityCtrl.canFoundCity(col, row, resources)
    if (!check.can) {
      this.showMessage(check.reason || 'Não é possível fundar cidade aqui.')
      return
    }

    // 4. Fundar a cidade!
    const cost = this.cityCtrl.getFoundCost()
    this.hero.resources.wood -= cost.wood
    this.hero.resources.ore -= cost.ore

    const city = this.cityCtrl.foundCity('Nova Capital', 'castle', col, row, 'player')
    if (city) {
      this.drawCities()
      this.updateHUD()
      this.showMessage('Cidade fundada com sucesso!', '#44ff44')
    }
  }

  private showMessage(txt: string, color: string = '#ff4444') {
    const cam = this.cameras.main
    const msg = this.add.text(cam.width / 2, cam.height / 2, txt, {
      fontSize: '20px', color, fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0)

    this.tweens.add({
      targets: msg, y: msg.y - 50, alpha: 0, duration: 2000,
      onComplete: () => msg.destroy()
    })
  }

  private setupMouseInput() {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isMoving) return
      const hex = this.pixelToHex(pointer.x, pointer.y)
      if (!hex || (hex.col === this.hero.col && hex.row === this.hero.row)) {
        this.highlightGraphics.clear(); return
      }
      const { path, totalCost } = this.pathfinder.find(
        this.map, MAP_COLS, MAP_ROWS,
        { col: this.hero.col, row: this.hero.row }, hex
      )
      if (!path.length) { this.highlightGraphics.clear(); return }
      this.drawHighlight(path, totalCost <= this.hero.movesLeft)
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isMoving) return
      const hex = this.pixelToHex(pointer.x, pointer.y)
      if (!hex) return
      const { path, totalCost } = this.pathfinder.find(
        this.map, MAP_COLS, MAP_ROWS,
        { col: this.hero.col, row: this.hero.row }, hex
      )
      if (!path.length || totalCost > this.hero.movesLeft) return
      this.highlightGraphics.clear()
      this.walkPath(path)
    })
  }

  // --- MOVEMENT ---

  private executeMove(to: HexCoord, cost: number) {
    const result = this.heroCtrl.move(this.hero, this.map, to, cost, this.resourceNodes)
    if (!result.moved) return

    const { x, y } = hexToPixel(to.col, to.row, HEX_SIZE)
    this.tweens.add({
      targets: this.heroSprite,
      x: x + HEX_SIZE, y: y + HEX_SIZE,
      duration: 150, ease: 'Power2',
      onComplete: () => {
        this.fog.reveal(this.map, MAP_COLS, MAP_ROWS, { col: this.hero.col, row: this.hero.row }, FOG_RADIUS)
        this.drawFog()
        this.drawResources()
        if (result.resourceCollected) this.showCollectMessage(result.resourceCollected)
        this.updateHUD()
      },
    })
  }

  private walkPath(path: HexCoord[]) {
    if (!path.length) { this.isMoving = false; this.promptExplore(); return }
    this.isMoving = true
    const next = path.shift()!
    const tile  = this.map[next.row][next.col]

    const result = this.heroCtrl.move(this.hero, this.map, next, tile.moveCost, this.resourceNodes)
    if (!result.moved) { this.isMoving = false; return }

    const { x, y } = hexToPixel(next.col, next.row, HEX_SIZE)
    this.tweens.add({
      targets: this.heroSprite,
      x: x + HEX_SIZE, y: y + HEX_SIZE,
      duration: 150, ease: 'Power2',
      onComplete: () => {
        this.fog.reveal(this.map, MAP_COLS, MAP_ROWS, { col: this.hero.col, row: this.hero.row }, FOG_RADIUS)
        this.drawFog()
        this.drawResources()
        if (result.resourceCollected) this.showCollectMessage(result.resourceCollected)
        this.updateHUD()
        if (path.length && this.heroCtrl.canAfford(this.hero, this.map[path[0].row][path[0].col].moveCost))
          this.walkPath(path)
        else {
          this.isMoving = false
          this.promptExplore()
        }
      },
    })
  }

  private promptExplore() {
    const tile = this.map[this.hero.row][this.hero.col]
    if (tile.type === 'water' || tile.type === 'mountain') return

    const cam = this.cameras.main
    const bg  = this.add.graphics().setDepth(60).setScrollFactor(0)
    bg.fillStyle(0x000000, 0.7)
    bg.fillRoundedRect(cam.width / 2 - 180, cam.height / 2 - 40, 360, 80, 12)

    const label = tile.type.toUpperCase()
    const msg = this.add.text(cam.width / 2, cam.height / 2 - 12,
      `Explorar região: ${label}?`, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(61)

    const hint = this.add.text(cam.width / 2, cam.height / 2 + 14,
      '[ENTER] Entrar   [ESC] Cancelar', {
        fontSize: '13px', color: '#ffdd57', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(61)

    const close = () => {
      bg.destroy(); msg.destroy(); hint.destroy()
      this.input.keyboard!.off('keydown-ENTER', onEnter)
      this.input.keyboard!.off('keydown-ESC',   onEsc)
    }

    const onEnter = () => {
      close()
      this.scene.start('RegionScene', {
        originTile: tile.type,
        heroCol:    this.hero.col,
        heroRow:    this.hero.row,
        resources:  { ...this.hero.resources },
        seed:       this.hero.col * 1000 + this.hero.row,
      })
    }
    const onEsc = () => close()

    this.input.keyboard!.once('keydown-ENTER', onEnter)
    this.input.keyboard!.once('keydown-ESC',   onEsc)
  }

  private endTurn() {
    this.heroCtrl.endTurn(this.hero)
    this.turnCount++
    this.updateHUD()
    const msg = this.add.text(512, 350, 'Novo Turno!', {
      fontSize: '32px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(50)
    this.tweens.add({
      targets: msg, alpha: 0, duration: 1000, delay: 500,
      onComplete: () => msg.destroy(),
    })
  }

  // --- UTILS ---

  private hexPoints(cx: number, cy: number): Phaser.Math.Vector2[] {
    const pts: Phaser.Math.Vector2[] = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i)
      pts.push(new Phaser.Math.Vector2(cx + HEX_SIZE * Math.cos(angle), cy + HEX_SIZE * Math.sin(angle)))
    }
    return pts
  }

  private pixelToHex(px: number, py: number): HexCoord | null {
    let best: HexCoord | null = null
    let bestDist = Infinity
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const { x, y } = hexToPixel(col, row, HEX_SIZE)
        const dist = Math.hypot(px - (x + HEX_SIZE), py - (y + HEX_SIZE))
        if (dist < bestDist) { bestDist = dist; best = { col, row } }
      }
    }
    return bestDist < HEX_SIZE ? best : null
  }

  private showCollectMessage(res: ResourceNode) {
    const { x, y } = hexToPixel(res.col, res.row, HEX_SIZE)
    const text = this.add.text(x + HEX_SIZE, y, `+${res.amount} ${res.type}`, {
      fontSize: '14px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40)
    this.tweens.add({
      targets: text, y: y - 40, alpha: 0, duration: 1200,
      onComplete: () => text.destroy(),
    })
  }

  private buildResources(): ResourceNode[] {
    return [
      // Gold
      { col: 3,  row: 2,  type: 'gold', amount: 500, collected: false },
      { col: 8,  row: 5,  type: 'gold', amount: 300, collected: false },
      { col: 16, row: 5,  type: 'gold', amount: 400, collected: false },
      // Wood
      { col: 2,  row: 4,  type: 'wood', amount: 15,  collected: false },
      { col: 14, row: 3,  type: 'wood', amount: 10,  collected: false },
      { col: 2,  row: 9,  type: 'wood', amount: 8,   collected: false },
      { col: 9,  row: 11, type: 'wood', amount: 12,  collected: false },
      // Ore
      { col: 5,  row: 1,  type: 'ore',  amount: 10,  collected: false },
      { col: 12, row: 6,  type: 'ore',  amount: 5,   collected: false },
      { col: 7,  row: 10, type: 'ore',  amount: 7,   collected: false },
      { col: 15, row: 9,  type: 'ore',  amount: 10,  collected: false },
    ]
  }
}
