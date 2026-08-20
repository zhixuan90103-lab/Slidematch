# 来源

NotebookLM：**SlideMatch · 有效来源**  
https://notebooklm.google.com/notebook/01c159a3-b263-45ab-ae06-564996aacb77

## 听谁的

1. [DESIGN.md](./DESIGN.md) + 已定 9×9  
2. [AGENTS.md](../AGENTS.md) 底座硬性  
3. 盘面数字、占坑、重力：TripleMatch 代码（`GameSettings`，不用 Config 的 42）  
4. 指针 / DOM 盘 / rect：SlidetoWord `portrait-webgpu-base/src/game/mount.ts`  
5. 射线 path、三消匹配、刚体物理：不听  

## 对照路径

| 工程 | 路径 | 用什么 |
|------|------|--------|
| TripleMatch | `/Users/wangzhixuan/Documents/XcodeWork/TripleMatch` | 41/38、−13、Cell 占坑、一步一格、0.22、`scanAndStartDrops` |
| SlidetoWord | `/Users/wangzhixuan/Documents/Threejs_Work/SlidetoWord/portrait-webgpu-base` | 第一指、rect、`lockGestures`、`wave.ts` 匀速占坑 |
| 本仓 | `src/game/*` · `src/assets/` | 静盘美术与视觉参数 |

业界（只判断标准与否，不提供像素）：Bejeweled 类重力、[Catlike Match-3](https://catlikecoding.com/unity/tutorials/prototypes/match-3/)、[Two Dots mechanics](https://twodots.fandom.com/wiki/Game_mechanics)、[勿用刚体做三消](https://foxsterdev.medium.com/top-7-unity-architecture-mistakes-in-match3-games-39c22c6e8243)。没有 Royal Match 官方源码。

不引用：应用商店同名页、财务瀑布图、攻略帖。
