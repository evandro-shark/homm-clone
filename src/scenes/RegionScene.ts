// RegionScene.ts v1.2.0
import Phaser from 'phaser'
import type { TileType, Resources } from '../config/types'
import { RegionGenerator } from '../core/map/RegionGenerator'
import type { RegionMap, RegionTile, RegionTileType } from '../core/map/RegionGenerator'
import { RegionPathfinder } from '../core/map/RegionPathfinder'
import type { GridCoord } from '../core/map/RegionPathfinder'

const TILE_SIZE   = 40
const HERO_SPEED  = 180

const TILE_COLORS: Record<RegionTileType, number> = {
  ground:   0x5a8a4a,
  tree:     0x1e4d1a,
  rock:     0x6a5a4a,
  water:    0x1a5a7a,
  path:     0xc8a84b,
  chest:    0x5a8a4a,
  merchant: 0x5a8a4a,
}

const OBSTACLE_COLORS: Record<RegionTileType, number | null> = {
  ground:   null,
  tree:     0x2d7a27,
  rock:     0x8a7a6a,
  water:    null,
  path:     null,
  chest:    0xffd700,
  merchant: 0xff8c00,
}

export interface RegionSceneData {
  originTile: TileType
  heroCol:    number
  heroRow:    number
  resources:  Resources
  seed:       number
}

export class RegionScene extends Phaser.Scene {
  // --- modules ---
  private generator  = new RegionGenerator()
  private pathfinder = new RegionPathfinder()

  // --- state ---
  private regionMap!:   RegionMap
  private resources!:   Resources
  private sceneData!:   RegionSceneData
  private walkPath:     GridCoord[] = []
  private isWalking =   false

  // --- graphics ---
  private hero!:              Phaser.GameObjects.Container
  private mapGraphics!:       Phaser.GameObjects.Graphics
  private highlightGraphics!: Phaser.GameObjects.Graphics
  private obstacleGraphics!:  Phaser.GameObjects.Graphics
  private hudIcons!:         Phaser.GameObjects.Graphics
  private hudResourceTexts:  Phaser.GameObjects.Text[] = []

  // --- item tracking ---
  private itemMap = new Map<string, { graphics: Phaser.GameObjects.Graphics; tile: RegionTile }>()

  constructor() { super({ key: 'RegionScene' }) }

  init(data: RegionSceneData) {
    this.sceneData = data
    this.resources = { ...data.resources }
    this.walkPath  = []
    this.isWalking = false
    this.itemMap.clear()
  }

  create() {
    this.regionMap = this.generator.generate(this.sceneData.originTile, this.sceneData.seed)

    const worldW = this.regionMap.cols * TILE_SIZE
    const worldH = this.regionMap.rows * TILE_SIZE
    this.cameras.main.setBounds(0, 0, worldW, worldH)

    this.mapGraphics       = this.add.graphics().setDepth(0)
    this.highlightGraphics = this.add.graphics().setDepth(2)
    this.obstacleGraphics  = this.add.graphics().setDepth(3)

    this.drawTiles()
    this.drawObstacles()
    this.drawItems()
    this.spawnHero()
    this.createHUD()
    this.setupInput()
    this.showEnterMessage()
  }

  update() {
    this.stepWalk()
    this.checkItemPickup()
  }

  // --- DRAW ---

  private drawTiles() {
    for (let row = 0; row < this.regionMap.rows; row++) {
      for (let col = 0; col < this.regionMap.cols; col++) {
        const tile = this.regionMap.tiles[row][col]
        const x = col * TILE_SIZE, y = row * TILE_SIZE
        this.mapGraphics.fillStyle(TILE_COLORS[tile.type])
        this.mapGraphics.fillRect(x, y, TILE_SIZE, TILE_SIZE)
        this.mapGraphics.lineStyle(1, 0x000000, 0.12)
        this.mapGraphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE)
      }
    }
  }

  private drawObstacles() {
    for (let row = 0; row < this.regionMap.rows; row++) {
      for (let col = 0; col < this.regionMap.cols; col++) {
        const tile  = this.regionMap.tiles[row][col]
        const color = OBSTACLE_COLORS[tile.type]
        if (color === null || tile.type === 'chest') continue
        const cx = col * TILE_SIZE + TILE_SIZE / 2
        const cy = row * TILE_SIZE + TILE_SIZE / 2
        if (tile.type === 'tree') {
          this.obstacleGraphics.fillStyle(color)
          this.obstacleGraphics.fillTriangle(cx, cy - 18, cx - 13, cy + 10, cx + 13, cy + 10)
          this.obstacleGraphics.fillStyle(0x5c3317)
          this.obstacleGraphics.fillRect(cx - 4, cy + 10, 8, 8)
        } else if (tile.type === 'rock') {
          this.obstacleGraphics.fillStyle(color)
          this.obstacleGraphics.fillCircle(cx, cy, 14)
          this.obstacleGraphics.fillStyle(0x9a8a7a)
          this.obstacleGraphics.fillCircle(cx - 4, cy - 4, 7)
        }
      }
    }
  }

  private drawItems() {
    this.itemMap.clear()
    for (let row = 0; row < this.regionMap.rows; row++) {
      for (let col = 0; col < this.regionMap.cols; col++) {
        const tile = this.regionMap.tiles[row][col]
        if (tile.type !== 'chest' || !tile.item) continue
        const cx = col * TILE_SIZE + TILE_SIZE / 2
        const cy = row * TILE_SIZE + TILE_SIZE / 2
        const g  = this.add.graphics().setDepth(4)
        g.fillStyle(0xffd700)
        g.fillRect(cx - 10, cy - 10, 20, 20)
        g.lineStyle(2, 0xffffff, 0.8)
        g.strokeRect(cx - 10, cy - 10, 20, 20)
        g.fillStyle(0xff8800)
        g.fillRect(cx - 5, cy - 5, 10, 10)
        this.itemMap.set(`${col},${row}`, { graphics: g, tile })
      }
    }
  }

  // --- HERO ---

  private spawnHero() {
    const x = 2 * TILE_SIZE + TILE_SIZE / 2
    const y = 2 * TILE_SIZE + TILE_SIZE / 2

    const body = this.add.graphics()
    body.fillStyle(0x4169e1)
    body.fillTriangle(0, -16, -11, 11, 11, 11)
    body.fillStyle(0xffd700)
    body.fillCircle(0, -18, 5)

    this.hero = this.add.container(x, y, [body]).setDepth(10)
    this.cameras.main.startFollow(this.hero, true, 0.08, 0.08)
  }

  // --- INPUT ---

  private setupInput() {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y)
      const to    = this.pixelToGrid(world.x, world.y)
      if (!to) { this.highlightGraphics.clear(); return }
      const from = this.heroToGrid()
      if (from.col === to.col && from.row === to.row) { this.highlightGraphics.clear(); return }
      const path = this.pathfinder.find(this.regionMap.tiles, this.regionMap.cols, this.regionMap.rows, from, to)
      this.drawHighlight(path)
    })

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // ignora clique no HUD
      if (p.y > this.cameras.main.height - 58) return
      const world = this.cameras.main.getWorldPoint(p.x, p.y)
      const to    = this.pixelToGrid(world.x, world.y)
      if (!to) return
      const from = this.heroToGrid()
      const path = this.pathfinder.find(this.regionMap.tiles, this.regionMap.cols, this.regionMap.rows, from, to)
      if (!path.length) return
      this.highlightGraphics.clear()
      this.walkPath  = path
      this.isWalking = true
    })

    this.input.keyboard!.on('keydown-ESC', () => this.exitRegion())
  }

  // --- MOVEMENT ---

  private stepWalk() {
    if (!this.isWalking || !this.walkPath.length) {
      this.isWalking = false
      return
    }

    const target    = this.walkPath[0]
    const targetX   = target.col * TILE_SIZE + TILE_SIZE / 2
    const targetY   = target.row * TILE_SIZE + TILE_SIZE / 2
    const dx        = targetX - this.hero.x
    const dy        = targetY - this.hero.y
    const dist      = Math.hypot(dx, dy)

    if (dist < 2) {
      this.hero.setPosition(targetX, targetY)
      this.walkPath.shift()
      this.checkItemPickup()
      if (!this.walkPath.length) this.isWalking = false
      return
    }

    const speed = HERO_SPEED * (this.game.loop.delta / 1000)
    this.hero.x += (dx / dist) * speed
    this.hero.y += (dy / dist) * speed
  }

  // --- ITEM PICKUP ---

  private checkItemPickup() {
    const grid = this.heroToGrid()
    const key  = `${grid.col},${grid.row}`
    const item = this.itemMap.get(key)
    if (!item) return

    const { kind, amount } = item.tile.item!
    this.resources[kind as keyof Resources] += amount
    item.graphics.destroy()
    this.itemMap.delete(key)
    // marca tile como coletado
    this.regionMap.tiles[grid.row][grid.col] = {
      ...this.regionMap.tiles[grid.row][grid.col],
      type: 'ground',
      item: undefined,
    }
    this.showCollectMessage(kind, amount, this.hero.x, this.hero.y)
    this.updateHUD()
  }

  // --- HIGHLIGHT ---

  private drawHighlight(path: GridCoord[]) {
    this.highlightGraphics.clear()
    if (!path.length) return
    for (const { col, row } of path) {
      const x = col * TILE_SIZE, y = row * TILE_SIZE
      this.highlightGraphics.fillStyle(0xffffff, 0.18)
      this.highlightGraphics.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      this.highlightGraphics.lineStyle(1, 0xffffff, 0.5)
      this.highlightGraphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE)
    }
    // destaca destino
    const last = path[path.length - 1]
    this.highlightGraphics.fillStyle(0xffffff, 0.35)
    this.highlightGraphics.fillRect(last.col * TILE_SIZE, last.row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
  }

  // --- HUD ---

  private createHUD() {
    const cam  = this.cameras.main
    const hudY = cam.height - 58

    const bg = this.add.graphics().setScrollFactor(0).setDepth(50)
    bg.fillStyle(0x111111, 0.92)
    bg.fillRect(0, hudY, cam.width, 58)
    bg.lineStyle(1, 0x444444, 1)
    bg.lineBetween(0, hudY, cam.width, hudY)

    // label da região
    const origin = this.sceneData.originTile.toUpperCase()
    this.add.text(cam.width - 10, hudY + 6, `Região: ${origin}`, {
      fontSize: '14px', color: '#aaffaa', fontFamily: 'monospace',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(51)

    // ícones + valores de recursos
    this.hudIcons = this.add.graphics().setScrollFactor(0).setDepth(51)
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
      }).setScrollFactor(0).setDepth(51)
    })

    // hints
    this.add.text(cam.width - 10, hudY + 30,
      '[Mouse] mover   [ESC] voltar ao mapa', {
        fontSize: '11px', color: '#555555', fontFamily: 'monospace',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(51)

    this.updateHUD()
  }

  private updateHUD() {
    const { gold, wood, ore } = this.resources
    const vals = [gold, wood, ore]
    const labels = ['Gold', 'Wood', 'Ore']
    this.hudResourceTexts.forEach((t, i) => t.setText(`${labels[i]}: ${vals[i]}`))
  }

  // --- UTILS ---

  private heroToGrid(): GridCoord {
    return {
      col: Math.round((this.hero.x - TILE_SIZE / 2) / TILE_SIZE),
      row: Math.round((this.hero.y - TILE_SIZE / 2) / TILE_SIZE),
    }
  }

  private pixelToGrid(x: number, y: number): GridCoord | null {
    const col = Math.floor(x / TILE_SIZE)
    const row = Math.floor(y / TILE_SIZE)
    if (col < 0 || col >= this.regionMap.cols || row < 0 || row >= this.regionMap.rows) return null
    if (!this.regionMap.tiles[row][col].walkable) return null
    return { col, row }
  }

  private showCollectMessage(kind: string, amount: number, x: number, y: number) {
    const text = this.add.text(x, y - 10, `+${amount} ${kind}`, {
      fontSize: '14px', color: '#ffd700', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30)
    this.tweens.add({
      targets: text, y: y - 50, alpha: 0, duration: 1200,
      onComplete: () => text.destroy(),
    })
  }

  private showEnterMessage() {
    const cam   = this.cameras.main
    const label = this.sceneData.originTile.toUpperCase()
    const msg   = this.add.text(cam.width / 2, cam.height / 2, `Explorando: ${label}`, {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60)
    this.tweens.add({
      targets: msg, alpha: 0, duration: 1200, delay: 800,
      onComplete: () => msg.destroy(),
    })
  }

  private exitRegion() {
    this.walkPath  = []
    this.isWalking = false
    this.scene.start('AdventureMapScene', {
      resources: this.resources,
      heroCol:   this.sceneData.heroCol,
      heroRow:   this.sceneData.heroRow,
    })
  }
}
