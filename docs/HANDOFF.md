# 交接 — SlideMatch（给下一个窗口）

仓库：`/Users/wangzhixuan/Documents/Threejs_Work/Slidematch`  
远程：`git@github.com:zhixuan90103-lab/Slidematch.git` · `main` · `d014c4c`  
第一入口：[AGENTS.md](../AGENTS.md) · 玩法：[DESIGN.md](./DESIGN.md) · 盘面：[BOARD.md](./BOARD.md)

## 一句话

竖屏 **最长路径消除**（单指划同色、可拐弯、抬手才消）。底座是 390×844 WebGPU + Capacitor iOS。  
**阶段 A 静盘 + 阶段 B 滑动几何已完成，还不能消子下落。** 下一刀是阶段 C。

## 现在打开能看到什么

```bash
cd /Users/wangzhixuan/Documents/Threejs_Work/Slidematch
npm run dev          # 默认 5190，strictPort，被占会失败
# 本机常被别的项目占 5190，可用：npx vite --host 127.0.0.1 --port 5301
```

烘焙桌面背景、浅杏九宫框、9×9 点心棋子。点格会高亮。调参面板 **隐藏**（`#tune-panel { display: none }`）。

## 玩法（已拍板，未全部实现）

- 9×9（不用初稿 10×10）；开局 5 色：红心、金饼、蓝圈、紫冻、绿马卡龙  
- 八向、可拐、≥3、**仅抬手结算**；滑动中不消、不触发道具  
- 道具档：6–7 / 8–9 / ≥10 → 1/2/3 级；当次不用；未定点（占格、变哪色、爆炸形状）先别做  
- 下落：全局重力、格子 `current`+`incoming`、下方空才掉、0.22 释放。见 [DROP.md](./DROP.md)  
- 路径输入只借 SlidetoWord **第一指 / rect / cancel 续划**，不借射线。见 [SWIPE.md](./SWIPE.md)

## 视觉 vs 逻辑（实现时别搅在一起）

| 层 | 是什么 | 默认 |
|----|--------|------|
| 逻辑 | 永远 9×9 行列 | `ROWS/COLS` |
| 视觉框 | `#game-board` 外沿，九宫 `board-frame.png` | 380×380 |
| 浅格 | `cell.png`，大小/透明度独立 | 38px · 100% |
| 间距 | 只改缝，不改格、不改框 | 3 |
| 棋子 | 只改图标大小 | 34 |
| 框厚 | `FRAME_WIDTH` 代码常量，无滑条 | 10 |
| 九宫切边 | `FRAME_SLICE` | 40（800² 素材） |

每个调参只干一件事：`src/game/settings.ts` `TUNE_DEFAULTS`。缓存 key `slidematch.tune.v4`。

布局：框水平居中，相对舞台垂直中心再下 **13**。点中用 **`.board-cells` 的 getBoundingClientRect**，不要对 scale 再除一次。

## 素材（`src/assets/`，保持 PNG，勿再压 JPEG）

`bg-table.png` 1536×2752 · `board-frame.png` 800×800 · `cell.png` 300×300 · 五子各 700×700。  
`#stage` `color-scheme: light`；WebGPU `alpha` + `NoToneMapping`，背景走 CSS。

## 代码地图

```
src/main.ts              启动：锁手势、透明 renderer、mountBoard
src/game/config.ts       行列、框切片、棋子 import
src/game/settings.ts     视觉默认 / computeLayout
src/game/board.ts        点中、初盘保证 ≥3 八向连通
src/game/path.ts         加格/减格（见 SWIPE.md）
src/game/input.ts        第一指、cancel 续划
src/game/mount.ts        DOM + 路径接线 + 隐藏 tune
src/create-renderer.ts   WebGPU，canvas pointer-events:none
src/adapt/*              design / preview / safeArea / lockGestures
```

下一刀：阶段 C 抬手消 + 占坑下落。路径规则以 [SWIPE.md](./SWIPE.md) 为准。

## 硬性（AGENTS）

`base: './'` · UI 只挂 `#ui-root` · 禁止 `position: fixed` 贴窗 · 禁止 `setSize(innerWidth)` · 无 WebGPU 明示失败 · 改震动 Swift 要 `ios:bootstrap`。

## 对照工程（只抄约定过的）

- TripleMatch：`/Users/wangzhixuan/Documents/XcodeWork/TripleMatch` — 占坑、一步一格、0.22（布局数字已被 tune 覆盖）  
- SlidetoWord：`.../SlidetoWord/portrait-webgpu-base` — 指针所有权，不抄射线  
- NotebookLM：https://notebooklm.google.com/notebook/01c159a3-b263-45ab-ae06-564996aacb77  

## 未定点（别擅自填进盘面逻辑）

道具占格 · 1 级变哪色 · 爆炸形状 · 分数字。路径死区/出盘/X 见 [SWIPE.md](./SWIPE.md)。

## 新窗口第一句建议

「继续 SlideMatch。先读 `docs/HANDOFF.md` 和 `SWIPE.md`。阶段 B 滑动已做，做阶段 C：抬手消 + 下落。」
