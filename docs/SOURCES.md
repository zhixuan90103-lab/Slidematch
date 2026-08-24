# 来源

NotebookLM：**SlideMatch · 有效来源**  
https://notebooklm.google.com/notebook/01c159a3-b263-45ab-ae06-564996aacb77

权威顺序见 [SPEC.md](./SPEC.md)。

## 听谁的

1. [AGENTS.md](../AGENTS.md) 底座硬性  
2. [DESIGN.md](./DESIGN.md) 玩法 6×6 · ≥2  
3. [ITEMS.md](./ITEMS.md) 道具生成与结算  
4. [OPERATION.md](./OPERATION.md) 滑动手感  
5. [BOARD.md](./BOARD.md) + `src/game/design.ts` 盘面与棋子绘制数字  
6. 下落运动：只听 [DROP.md](./DROP.md) + `LOOK.dropV0` / `dropAccel` / `dropVMax`。占坑形态可参考 TripleMatch（`current`/`incoming`、0.22），**不要听它的 g/v0/vMax** 
7. 指针 / DOM 盘 / rect：SlidetoWord `portrait-webgpu-base/src/game/mount.ts`  
8. 射线 path、三消匹配、刚体物理：不听  
9. 滑动检索：[SWIPE-RESEARCH.md](./SWIPE-RESEARCH.md)（不覆盖规则）  

## 对照路径

| 工程 | 路径 | 用什么 |
|------|------|--------|
| TripleMatch | `/Users/wangzhixuan/Documents/XcodeWork/TripleMatch` | 仅占坑形态；运动参数以本仓 LOOK 为准 |
| SlidetoWord | `/Users/wangzhixuan/Documents/Threejs_Work/SlidetoWord/portrait-webgpu-base` | 第一指、rect、`lockGestures`、`wave.ts` 匀速占坑 |
| 本仓 | `src/game/design.ts` · `src/game/*` · `src/assets/` | 规格数字与实现 |

业界（只判断标准与否，不提供像素）：Bejeweled 类重力、[Catlike Match-3](https://catlikecoding.com/unity/tutorials/prototypes/match-3/)、[Two Dots mechanics](https://twodots.fandom.com/wiki/Game_mechanics)、[勿用刚体做三消](https://foxsterdev.medium.com/top-7-unity-architecture-mistakes-in-match3-games-39c22c6e8243)。没有 Royal Match 官方源码。

不引用：应用商店同名页、财务瀑布图、攻略帖。
