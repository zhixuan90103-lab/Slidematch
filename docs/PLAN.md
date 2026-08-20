# 实施计划

权威：[DESIGN.md](./DESIGN.md) · [BOARD.md](./BOARD.md) · [SWIPE.md](./SWIPE.md) · [DROP.md](./DROP.md)

| 阶段 | 结果 | 状态 |
|------|------|------|
| A | 9×9 静盘 + 烘焙美术 + 视觉/逻辑分离 | **已做** |
| B | 可拐弯划、回退、&lt;3 取消 | 未做 |
| C | 抬手消、占坑下落、顶补、整盘锁 | 未做 |
| D | 长度 6/8/10 档视+震，封顶 | 未做 |
| E | 道具 | 未定点 |
| F | 分数公式 | 未定点 |

## 阶段 A 已落地

- 底座：390×844、contain、透明 WebGPU、桌面背景图  
- 美术：框九宫、浅格、五色点心 PNG  
- 调参：宽/高/缝/子/格/透明度，各管一事；面板默认隐藏  
- 点中高亮（还不是路径）

## 代码

```
src/game/config.ts     行列、框切片、棋子路径
src/game/settings.ts   视觉默认与 layout
src/game/board.ts      点中、初盘保证 ≥3 连通
src/game/mount.ts      DOM + 隐藏的 tune
src/assets/            见 BOARD.md
```

玩法下一刀：`path.ts` + `input.ts`（见 SWIPE）。

## 禁止

射线当路径；`setSize(innerWidth)`；玩法 UI `position: fixed`；WebGL 静默回退；热路径 `new Audio()`；用 `prepare()` 判断震动；未定点道具塞进格子；素材再压成低质量 JPEG。
