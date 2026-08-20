# 规范地图

打开仓库先读本文，再按表往下钻。冲突时按下表序号，**序号小的赢**。

| # | 文件 | 管什么 | 不管什么 |
|---|------|--------|----------|
| 1 | [AGENTS.md](../AGENTS.md) | 底座硬性：390×844、`base: './'`、DOM、无 WebGL 回退、iOS Safe Area | 玩法细节 |
| 2 | [DESIGN.md](./DESIGN.md) | 玩法：9×9、五色、八向、≥3、仅抬手消、无落地自动三消、道具档语义 | 像素、插值、粘滞角 |
| 3 | [OPERATION.md](./OPERATION.md) | **操作手感**：点中、插值、加格、减格、常数、验收 | 消子、下落、分数 |
| 4 | [BOARD.md](./BOARD.md) | 视觉框 / 浅格 / 棋子 / 素材 | 路径算法 |
| 5 | [DROP.md](./DROP.md) | 占坑、重力、0.22 | 滑动输入 |
| 6 | [SWIPE.md](./SWIPE.md) | 路径规则摘要 | 手感实现（让 3） |

备忘、不当局：[SWIPE-RESEARCH.md](./SWIPE-RESEARCH.md)、[PLAN.md](./PLAN.md)、[HANDOFF.md](./HANDOFF.md)、[SOURCES.md](./SOURCES.md)。

## 阶段

| 阶段 | 状态 |
|------|------|
| A 静盘 | 已做 |
| B 滑动 | 几何已做，手感见 OPERATION |
| C 消除 + 下落 | 未做 |
| D 长度档反馈 | 未做 |
| E 道具 / F 分数 | 未定点 |

## 操作（给实现者的三句）

1. 按下：浅格 rect → 最近格心 ≤ 0.8 格。  
2. 滑动：插值后每点从队尾八向加（粘滞 30°、过半步）；两轴快跳走直角折线；加不了才退上一格（须在旁）。  
3. 抬手：≥3 有效。阶段 B 不消子。

细节、禁区、验收十条 → [OPERATION.md](./OPERATION.md)。

## 试玩包

iOS 试玩包名 **`com.slidematch.phaseb`**（桌面名 SlideMatch B），勿覆盖 `com.example.portraitwebgpubase`。
