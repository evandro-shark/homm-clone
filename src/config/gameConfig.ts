import Phaser from 'phaser'
import { AdventureMapScene } from '../scenes/AdventureMapScene'
import { RegionScene }       from '../scenes/RegionScene'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#1a1a2e',
  scene: [AdventureMapScene, RegionScene],
  physics: { default: 'arcade', arcade: { debug: false } },
  pixelArt: true,
  parent: document.body,
}
