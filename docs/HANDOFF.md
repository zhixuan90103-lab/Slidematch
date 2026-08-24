# 交接 — SlideMatch（给下一个窗口）

仓库：`/Users/wangzhixuan/Documents/Threejs_Work/Slidematch`  
远程：`git@github.com:zhixuan90103-lab/Slidematch.git`  
第一入口：[SPEC.md](./SPEC.md) · [AGENTS.md](../AGENTS.md) · 玩法：[DESIGN.md](./DESIGN.md) · 手感：[OPERATION.md](./OPERATION.md) · 数字：`src/game/design.ts`

## 一句话

竖屏 **最长路径消除**（单指划同色、可拐弯、抬手才消）。底座 390×844 WebGPU + Capacitor iOS。  
**阶段 A + B + C 已完成。** 变色子已做：消 ≥5 在队尾出占格变色子，划入可换色续连。下一刀阶段 D：长度 6/8/10 档视+震。

## 新窗口请先读

1. `docs/SPEC.md` — 规范地图 + 当前规格  
2. `docs/DESIGN.md` — 玩法已拍板  
3. `docs/BOARD.md` — 盘面 / 棋子绘制  
4. `docs/OPERATION.md` — 滑动手感（不要改回「谁近加谁」）  
5. `docs/DROP.md` — 占坑 / 0.22 / 初速·加速度·上限 / 稳定子可划 
6. `src/game/design.ts` — `LOOK` / `PIECE_DRAW` / `RULES`  

## 新窗口第一句（可粘贴）

继续 SlideMatch。先读 `docs/SPEC.md`（含当前规格）、`DESIGN.md`、`BOARD.md`、`OPERATION.md`、`DROP.md`。阶段 A–C 已完成（6×6、≥2、四向、静止子可划）。下落：占坑 0.22；运动三条默认初速 600、加速度 1400、上限 1600（设置可改）。变色子：消 ≥5 在队尾出子，划入可换色续连。视觉与下落数字只改 `src/game/design.ts`。下一刀阶段 D：路径长度 6/8/10 档视+震。爆炸 / 累计分不要做。

## 阶段

| 阶段 | 状态 |
|------|------|
| A 静盘 | 已做（奶油框 + 薰衣草浅格 + 黏土五子） |
| B 滑动 | 已做；手感见 OPERATION。**先不要再改操作** |
| C 消除 + 下落 | **已做**（占坑 0.22、初速/加速度/上限、静止子可划） |
| D 6/8/10 档视+震 | **下一刀** |
| E 道具 | 变色子已做（消 ≥5）；爆炸 / 全盘清未定点 |
| F 分数 | 未定点 |

## 打开

```bash
cd /Users/wangzhixuan/Documents/Threejs_Work/Slidematch
npm run dev          # 默认 5190，被占会失败
# 常用：npx vite --host 127.0.0.1 --port 5301
npm run cap:sync && npx cap open ios   # 打真机
```

iOS **`com.slidematch.play` / SlideMatch**。

能看到：奶油舞台、九宫框、6×6 黏土棋子、浅格、顶栏 SCORE。可划可退；≥2 抬手消、占坑下落、顶补；邻列在掉时静止子仍可划。设置齿轮可调盘面与下落三条。

## 玩法（已拍板）

- 6×6、3 色、四向可拐、≥2、仅抬手结算；滑动中不消、不生成道具  
- 无落地后再自动三消  
- 下落：`current`+`incoming`、下方空才掉、0.22 释放；运动初速/加速度/上限。静止子可划。见 DROP.md  
- 变色子：无道具划 ≥5 生成；划入可换色；抬手清锁定色。用了道具不再出变色子。≥10 出清盘子。清盘子须再划 ≥10 才全盘。  
- HUD SCORE = 当次路径长度（占位）

## 操作要点（细节只信 OPERATION）

按下：`.board-cells` rect，最近格心 ≤ 0.8 格，且该格 `stable`。  
滑动：合批点 + 0.4 格插值；两轴快跳走直角折线；队尾四邻过边/进格、过角轴滞回；先加后减；只退上一格且须在旁。  
禁止：全盘最近格、四邻谁近加谁、8-supercover 直接加格、对角邻居、`preciseLocation` 进格。

## 代码

```
src/game/design.ts  产品数字（LOOK / ART / GRID / RULES / PIECE_DRAW）
src/game/config.ts  资源 + 再导出
src/game/settings.ts 调参覆盖 LOOK（含 dropV0 / dropAccel / dropVMax）
src/game/path.ts    四邻过边/进格、加/减、插值
src/game/input.ts   第一指、cancel 续划、合批
src/game/drop.ts    current/incoming、0.22、初速/加速度/上限
src/game/mount.ts   rect、喂点、高亮、抬手消、rAF 下落、设置
src/game/board.ts   cellFromLocal / 初盘四向 ≥ PATH_MIN 连通
```

下落：占坑 0.22、软间距 0.85；运动设置三条：初速 600、加速度 1400、上限 1600。落地压扁仍在。

## 硬性

`base: './'` · UI 只挂 `#ui-root` · 禁止 `position: fixed` · 禁止 `setSize(innerWidth)` · 无 WebGPU 明示失败 · 改 Swift 要 `ios:bootstrap`。

## 对照

- TripleMatch：仅历史占坑参考，**运动数字不听** 
- SlidetoWord：`.../SlidetoWord/portrait-webgpu-base` — 第一指，不抄射线  
- NotebookLM：https://notebooklm.google.com/notebook/01c159a3-b263-45ab-ae06-564996aacb77 （以 SPEC + OPERATION 为准）

## 未定点

道具占格 · 1 级变哪色 · 爆炸形状 · 累计分数字。对角 X 交叉阶段 B 允许。
