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
| C 消除 + 下落 | 已做（TripleMatch 重力 + 占坑 0.22） |
| D 长度档反馈 | 未做 |
| E 道具 / F 分数 | 未定点 |

## 操作（三则）

1. **按下。** 系统触点映射到浅格区；命中格为起点并锁色。未命中则不起划。  
2. **方向。** 参考格心 → 此刻手指；八向均分（轴 45°，扇区 ±22.5°）。第二格之前跟手：越界即改轴，未越界不改，以抑微振。  
3. **抬手确认。** 途中不定局。松手再判：≥3 确认消除并下落；&lt;3 作废。第二指中断不算抬手。下落中不接新划。

细节、禁区、验收十条 → [OPERATION.md](./OPERATION.md)。

## 试玩包

iOS 试玩包名 **`com.slidematch.phaseb`**（桌面名 SlideMatch B），勿覆盖 `com.example.portraitwebgpubase`。
