# Diretrizes do Projeto — HoMM Clone

## Sobre o Projeto

Clone inspirado em Heroes of Might and Magic 3, desenvolvido com:
- **Phaser.js** + **TypeScript** + **Vite**
- Multiplataforma (browser-first)
- Arquitetura modular e versionada

---

## Stack

| Ferramenta | Versão | Papel |
|------------|--------|-------|
| Node.js    | v24    | Runtime |
| npm        | v11    | Package manager |
| Vite       | v8     | Bundler / Dev server |
| Phaser     | latest | Game engine |
| TypeScript | latest | Linguagem |

---

## Arquitetura

```
src/
├── config/
│   ├── gameConfig.ts       # configuração central do Phaser
│   └── types.ts            # tipos globais + hex math utils
├── core/                   # lógica pura, SEM dependência do Phaser
│   ├── map/
│   │   ├── MapGenerator.ts     v1.0.0
│   │   ├── RoadGenerator.ts    v1.0.0
│   │   ├── FogOfWar.ts         v1.0.0
│   │   └── Pathfinder.ts       v1.0.0
│   └── hero/
│       └── HeroController.ts   v1.0.0
├── scenes/
│   ├── AdventureMapScene.ts    v1.0.0  # mapa mundial
│   └── RegionScene.ts          v1.0.0  # submapa de região (RPG)
└── version.ts              # registro de versões dos módulos
```

---

## Princípios de Arquitetura

1. **Separação total** — `core/` nunca importa Phaser. Lógica de negócio fica em `core/`, renderização e input ficam em `scenes/`
2. **Interfaces versionadas** — cada módulo exporta uma interface (`IPathfinder`, `IFogOfWar`, etc.). Evoluções criam `_v2` sem quebrar o existente
3. **`version.ts`** — todo módulo novo ou atualizado deve ter sua versão registrada aqui
4. **Modularidade** — cada feature nova vira um módulo em `core/` antes de ser usada na cena
5. **Mínimo de código** — sem verbose, sem over-engineering. Só o necessário para a feature funcionar

---

## Diretrizes do Agente (Amazon Q)

- Assumir postura de engenheiro sênior com 20+ anos de experiência
- Sempre propor arquitetura antes de codar em tarefas complexas
- Sempre registrar versão em `version.ts` ao criar ou atualizar módulos
- Nunca misturar lógica de negócio com renderização
- Preferir interfaces sobre implementações concretas nos contratos entre módulos
- Ao evoluir um módulo, criar `v2` sem remover `v1` até migração completa
- Confirmar com o usuário antes de iniciar implementações grandes
- Responder em português

---

## Gameplay — Decisões Tomadas

### Mapa Mundial (`AdventureMapScene`)
- Grid hexagonal **flat-top**, offset col
- Tamanho: 18 colunas × 12 linhas
- Herói começa em `col:1, row:1` com **10 movimentos**
- Custo de movimento por tile:
  - `road` = 0.5
  - `grass` = 1.0
  - `forest` = 2.0
  - `water` / `mountain` = intransponível
- **Fog of War** com 3 estados: `hidden` / `explored` / `visible`
- Raio de visão: **3 hexes**
- Floresta **bloqueia visão** além dela
- Estradas geradas automaticamente via `RoadGenerator` conectando waypoints
- Pathfinding com **Dijkstra** respeitando custo real por tile
- Recursos revelados apenas quando tile está `explored` ou `visible`
- Movimento por **teclado** (Q/W/E/A/S/D) e **mouse** (clique com highlight do caminho)
- **ESPAÇO** encerra o turno e restaura movimentos

### Região (`RegionScene`) — em desenvolvimento
- Ativada quando herói para num hex no mapa mundial
- Submapa gerado **proceduralmente** baseado no tipo do tile
- Movimento estilo **RPG** (livre, não hex-a-hex)
- Conteúdo varia por tipo de tile:
  - `grass` → campos, aldeias, recursos
  - `forest` → árvores densas, animais, madeira
  - `road` → mercadores, eventos de viagem
- Botão "Voltar ao mapa" preserva estado do mapa mundial

---

## Roadmap

### Fase 1 — Mapa Mundial ✅
- [x] Grid hexagonal com fog of war
- [x] Herói com movimento por teclado e mouse
- [x] Pathfinding com custo por tile
- [x] Recursos coletáveis
- [x] Estradas geradas automaticamente
- [x] Sistema de turnos

### Fase 2 — Regiões ✅
- [x] RegionScene com geração procedural
- [x] Movimento RPG dentro da região
- [x] Itens e baús por região
- [x] Transição mapa mundial ↔ região (ENTER/ESC)
- [x] Recursos preservados ao voltar ao mapa

### Fase 3 — Cidades
- [ ] Cidades no mapa mundial
- [ ] Menu de construção
- [ ] Recrutamento de criaturas

### Fase 4 — Batalha
- [ ] Sistema de batalha tática em grid hex
- [ ] Criaturas com atributos
- [ ] Sistema de turnos de batalha
- [ ] Magias

### Fase 5 — Multiplayer
- [ ] Múltiplos heróis (hotseat)
- [ ] IA básica para inimigos
- [ ] Online (WebSocket)

---

## Como Continuar em um Novo Chat

1. Abra o projeto `homm-clone` no IDE
2. Mencione este arquivo: `@rules` ou cole o caminho `.amazonq/rules/project.md`
3. Diga: _"Leia as diretrizes do projeto e continue o desenvolvimento"_
4. O agente retomará de onde parou seguindo todos os princípios acima
