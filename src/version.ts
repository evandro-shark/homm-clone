export const MODULE_VERSIONS = {
  types:            '1.0.0',
  mapGenerator:     '1.0.0',
  fogOfWar:         '1.0.0',
  pathfinder:       '1.0.0',
  roadGenerator:    '1.0.0',
  heroController:   '1.0.0',
  regionGenerator:  '1.0.0',
  regionPathfinder: '1.0.0',
  adventureScene:   '1.1.0',
  regionScene:      '1.2.0',
} as const

export type ModuleName = keyof typeof MODULE_VERSIONS
