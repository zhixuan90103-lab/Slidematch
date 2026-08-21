# 下落与格子状态

对照 TripleMatch（`Models.swift` / `GameScene` / `GameSettings` / `PhysicsBasedDropSpec.md`）。  
SlidetoWord `wave.ts` 只有占坑 + 0.22 + 匀速，作运动第一档参考。

本玩法：**抬手消路径 → 重力补满 → 全盘 stable 再划**。无交换、无落地后再三消。

## 已确认

**全局统一重力。** 同一套 `g / v0 / vMax`，每帧先扫谁能开掉，再给所有 `dropping` 积分。列与列独立，公式相同。

**格子有状态，逻辑上一格一子。**

| 槽 | 含义 |
|----|------|
| `current` | 谁占着这格 |
| `incoming` | 谁订了这格、还没落地 |

**正下方一格能接，才打开上方的子**，目标永远是下一行，到了再订下一格。

**空（`canReceiveDrop`）**：`current` 与 `incoming` 都空。  
**不空**：还有 current（含已在掉但没走出 0.22 格）、还有 incoming、或正在 `clearing`。

源格变空：子相对格心向下走满 **0.22 格** 后 `clearPiece`。

## 棋子状态（本游戏）

用：`stable` / `dropping` / `clearing` / `spawning`。  
不用：`selected` / `swapping` / `settling`（落地直进 `stable`）。

路径只认 `stable`。下落 / 消除 / 生成中的子不可划；**其它静止子随时可划、抬手消**（不因邻列在掉而锁盘）。

## 物理参数（TripleMatch 默认）

| 参数 | 值 |
|------|-----|
| 静起 / 新生初速 | 150 / 100 px/s |
| 加速度 / 上限 | 1700 / 1500 |
| 释放源格 | 0.22 格 |
| 软间距 | 0.85 格（贴下方减速，不推顶） |
| 动量窗 | 落地 50ms 内再掉可继承速度 |
| 吸附 | 3 px |

第一版运动可匀速（约 65ms/格），**占坑必须是这一套**。不要用刚体引擎。

道具若占格，该格不能 `canReceiveDrop`（占格未定点，C 先当普通子）。

相关：[DESIGN.md](./DESIGN.md) · [SOURCES.md](./SOURCES.md)
