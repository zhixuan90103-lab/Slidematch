# 道具

玩法定位见 [DESIGN.md](./DESIGN.md)。数字：`src/game/design.ts` 的 `RULES`。实现：`src/game/items.ts`。手感不在本文（让 [OPERATION.md](./OPERATION.md)）。分数倍率见 DESIGN，消除格数含本文散消。

目的：**让玩家能连更长**。变色按路径长度清散子（不是整色清场）；魔法让本划忽略颜色。不做按钮式全盘清。

## 身份

占格，四向可划，和普通子同一套加/减格。盘上颗数无上限（最多 36）。顶补只出普通色。

| 色号 | 名 | 素材 | 滑动中 | 抬手（无更高优先） |
|------|----|------|--------|-------------------|
| 5 | 变色子 | `piece-convert.png` | 划过可换锁色 | 消路径 + N 颗锁定色散子，N=路径长 |
| 6 | 魔法子 | `piece-magic.png` | 本划全同色；全盘改画该贴图 | 只消路径；划满盘=清屏 |

## 滑动中（所有道具）

- 划入合法。过它之后下一格可换普通色（`flex`）。
- 从道具起划：锁定色未定，第一颗普通子锁定颜色。

**魔法额外：** `path.magic`。任意非空格可续连。只换贴图（`displayColor` → 色号 6），不改逻辑色、不加滤镜。退回不含魔法 / 抬手 / 取消：去掉 `#game-board.is-magic-look`。

## 抬手

stable 格 ≥ `pathMin` 才结算。滑动中不消、不出道具。

```
含魔法     → 只消路径（变色散消不做）。36 格全在路径里 = 清屏
仅含变色   → 消路径 + extraClearCells（见下）
无道具     → 只消路径
```

同路两种：魔法优先。变色子在路径里只当被消的一格。

### 变色散消 `extraClearCells`

1. 锁定色 = `path.color`（&lt; 0 则无散消）。
2. 候选 = 盘上该色、且不在路径上的格。路径视为已空。
3. **落单**：四邻没有「非路径、同锁定色」。落单全部排在成团之前；同档按行、再按列。
4. 取前 **N** 颗，N = `path.cells.length`。不够则有多少算多少。

不再清光该色剩余。

## 生成

队尾格、消除动画后放入。一次 1 种 1 颗。当次吃不到。路径里已有任意道具则不出。

| 已有道具 | 长度 | 生成 |
|----------|------|------|
| 有 | 任意 | 无 |
| 无 | &lt; `itemMin`(5) | 无 |
| 无 | ≥5 且 &lt; `magicMin`(10) | 变色子 |
| 无 | ≥10 | 魔法子 |

## 代码

抬手只算一次 `resolveStroke`（散消格 + 生成色），再交给 `beginClear` 与 `strokeScore`，不要各算一遍。

| 文件 | 职责 |
|------|------|
| `src/game/items.ts` | 生成、散消、显示色、`resolveStroke` |
| `src/game/path.ts` | 四邻加/减；`canLinkColor` / `applyLinkColor` |
| `src/game/mount.ts` | 抬手一次 resolve；魔法贴图 class |
| `src/game/drop.ts` | 消格 + `pendingItem`；不解释道具 |
| `src/game/score.ts` | n = 路径 + extraCells；倍率 |
| `src/game/design.ts` | `itemMin` / `magicMin` / 色号 |

禁止：滑动中消子或出道具；按钮式全盘清；顶补出道具；魔法叠滤镜；变色整色清场。
