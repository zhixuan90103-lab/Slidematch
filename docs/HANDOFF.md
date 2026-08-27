# 交接 — SlideMatch（给下一个窗口）

仓库：`/Users/wangzhixuan/Documents/Threejs_Work/Slidematch`  
远程：`git@github.com:zhixuan90103-lab/Slidematch.git`  
第一入口：[SPEC.md](./SPEC.md) · [AGENTS.md](../AGENTS.md) · 玩法：[DESIGN.md](./DESIGN.md) · 道具：[ITEMS.md](./ITEMS.md) · 反馈：[FEEDBACK.md](./FEEDBACK.md) · 手感：[OPERATION.md](./OPERATION.md) · 数字：`src/game/design.ts`

## 一句话

竖屏 **最长路径消除**（单指划同色、可拐弯、抬手才消）。底座 390×844 WebGPU + Capacitor iOS。  
**阶段 A + B + C + E + F 已完成。** 基础反馈（选中/消除/变色/合成飞入）已做，见 FEEDBACK。下一刀阶段 D：长度 6/8/10 档视+震。

## 新窗口请先读

1. `docs/SPEC.md` — 规范地图 + 当前规格  
2. `docs/DESIGN.md` — 玩法已拍板  
3. `docs/ITEMS.md` — 道具生成与结算  
4. `docs/FEEDBACK.md` — 选中 / 消除 / 变色 / 合成飞入  
5. `docs/BOARD.md` — 盘面 / 棋子绘制  
6. `docs/OPERATION.md` — 滑动手感（不要改回「谁近加谁」）  
7. `docs/DROP.md` — 占坑 / 0.22 / 腾格时机  
8. `docs/HAPTICS.md` — 接入 §0；玩法 I/S §0.8  
9. `src/game/design.ts` — `LOOK` / `RULES` / `FEEL` / `PIECE_DRAW`  

## 新窗口第一句（可粘贴）

继续 SlideMatch。先读 `docs/SPEC.md`、`DESIGN.md`、`ITEMS.md`、`FEEDBACK.md`、`BOARD.md`、`OPERATION.md`、`DROP.md`、`HAPTICS.md` §0。阶段 A–C–E–F 已完成。色种：开局 3，分数不解锁；用完魔法后顶补 ±1（3–5，降档约 55%）。翻牌走 yaw 横条；魔法是原色子 + 白板 overlay + 金币 overlay。路径 Additive **只叠金币 0.18**，白板不叠。HUD：左 COINS 方 130（胶囊条 + 图标 50 / X-14 + 数字槽宽 55 / X-20）、右 SCORE 长条，边距=间距 14；设置左下齿轮（存档 v26）。魔法飞币约路径 **2/3**，打 HUD 图标：终点 ×0.55、路程 62% 起淡出、打中 punch + rolling。角标进局预铺 36，只用 opacity。震动 `FEEL.haptic`：按下 0.55/0.86，过格与回退 0.35/0.50，散消点子 0.30/0.40，有效抬手找对 pattern。SceneDelegate 必须 `BridgeViewController()`。`lockGestures` 禁网页缩放/长按放大镜；系统 Home、缘滑返回拦不掉。视觉与反馈数字只改 `src/game/design.ts` 的 `LOOK` / `HUD` / `FEEL`。下一刀阶段 D：路径长度 6/8/10 档视+震。点魔法 / 划金币仍可能卡，见 PERF。按钮式全盘清 / 排行榜不要做。

## 阶段

| 阶段 | 状态 |
|------|------|
| A 静盘 | 已做（奶油框 + 薰衣草浅格 + 黏土三色：水滴 / 叶 / 太阳） |
| B 滑动 | 已做；手感见 OPERATION。**先不要再改操作** |
| C 消除 + 下落 | **已做**（占坑 0.22、初速/加速度/上限、静止子可划） |
| D 6/8/10 档视+震 | **下一刀** |
| E 道具 | 变色子 + 魔法子已做；按钮式全盘清不做 |
| F 分数 | 已做（累计 + n² + 道具倍率） |

## 打开

```bash
cd /Users/wangzhixuan/Documents/Threejs_Work/Slidematch
npm run dev          # 默认 5190，被占会失败
# 常用：npx vite --host 127.0.0.1 --port 5301
npm run cap:sync && npx cap open ios   # 打真机
```

iOS **`com.slidematch.play` / SlideMatch**。

能看到：奶油舞台、九宫框、6×6 黏土棋子、浅格、顶栏左 COINS 右 SCORE。可划可退（路径浮起+角标、其它色变暗）；≥2 抬手缩完腾格+碎屑；达门槛路径飞入队尾出道具。邻列在掉时静止子仍可划。真机：按下/过格/回退/散消点子/找对震动。设置左下齿轮。

## 玩法（已拍板）

- 6×6、开局 3 色、四向可拐、≥2、仅抬手结算；滑动中不消、不生成道具  
- 色种：分数不解锁。用完魔法后顶补 ±1（3–5，降档约 55%）。变色 / 普通划不改。只影响新落下的。  
- 无落地后再自动三消  
- 下落：`current`+`incoming`、下方空才掉、0.22 释放；运动初速/加速度/上限。静止子可划。见 DROP.md  
- 变色子：无道具 ≥5 生成（路径飞入队尾弹出）；划入可换色；滑动 Additive 标散子；松手倒数选中后按路径长度散消。无道具 ≥10 出魔法；**用变色子连 ≥10 也出魔法**。魔法：本划全同色，抬手只消路径。路径含魔法则变色散消不触发、也不出新道具。  
- HUD：右 SCORE（连格 +1/格预览；抬手一次滚到取整后的累计）。左 COINS：魔法路径每格 +1，飞向 HUD 金币图标。无设置按钮。

## 操作要点（细节只信 OPERATION）

按下：`.board-cells` rect，最近格心 ≤ 0.8 格，且该格 `stable`。  
滑动：合批点 + 0.4 格插值；两轴快跳走直角折线；队尾四邻过边/进格、过角轴滞回；先加后减；只退上一格且须在旁。  
禁止：全盘最近格、四邻谁近加谁、8-supercover 直接加格、对角邻居、`preciseLocation` 进格。

## 代码

```
src/game/design.ts  LOOK / ART / GRID / RULES / FEEL / HUD / PIECE_DRAW（`stepColorCount`）
src/game/config.ts  资源、yaw 横条、warmup
src/game/perfLog.ts 真机 [perf] 帧时（默认关；`?debugPerf=1` 才 console / sessionStorage）
src/game/items.ts   生成、散消、resolveStroke
src/game/score.ts   n² × 倍率，SCORE/COINS 累计滚动
src/game/clearFx.ts 消除碎屑
src/game/settings.ts 调参覆盖 LOOK + HUD（存档 v26；金币条高低/数字宽/图标 XY）
src/game/path.ts    四邻过边/进格、加/减、插值
src/game/input.ts   第一指、cancel 续划、合批
src/game/drop.ts    占坑 0.22、飞入一起腾格、道具格锁
src/game/convertLook.ts 锁色 / 魔法显示 / 变色四邻不暗
src/game/scoreFly.ts 金币飞向 HUD 金币图标
src/game/pathBadge.ts 路径角标运动、散消倒数
src/game/mount.ts   选中、角标、合成飞入、白板/金币 overlay、脏格子 rAF；魔法抬手写 `sim.colorCount`
src/game/board.ts   cellFromLocal / 初盘连通
```

下落：占坑 0.22、软间距 0.85；运动设置三条：初速 600、加速度 1400、上限 1600。落地压扁仍在。

震动：`FEEL.haptic`；`void haptics.playTransient` / `playPattern`。SceneDelegate **禁止** `CAPBridgeViewController()`。

## 硬性

`base: './'` · UI 只挂 `#ui-root` · 禁止 `position: fixed` · 禁止 `setSize(innerWidth)` · 无 WebGPU 明示失败 · 改 Swift 要 `ios:bootstrap` · 震动入口 `BridgeViewController()`。

## 对照

- TripleMatch：仅历史占坑参考，**运动数字不听** 
- SlidetoWord：`.../SlidetoWord/portrait-webgpu-base` — 第一指，不抄射线  
- NotebookLM：https://notebooklm.google.com/notebook/01c159a3-b263-45ab-ae06-564996aacb77 （以 SPEC + OPERATION 为准）

## 未定点

排行榜。对角 X 交叉阶段 B 允许。心 / 星：用完魔法后顶补色种 ±1（3–5，降档约 55%）。旧点心已删。
