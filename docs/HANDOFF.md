# 交接 — SlideMatch（给下一个窗口）

仓库：`/Users/wangzhixuan/Documents/Threejs_Work/Slidematch`  
远程：`git@github.com:zhixuan90103-lab/Slidematch.git`  
第一入口：[SPEC.md](./SPEC.md) · [AGENTS.md](../AGENTS.md) · 玩法：[DESIGN.md](./DESIGN.md) · 手感：[OPERATION.md](./OPERATION.md)

## 一句话

竖屏 **最长路径消除**（单指划同色、可拐弯、抬手才消）。底座 390×844 WebGPU + Capacitor iOS。  
**阶段 A + B + C 已完成（能划、抬手消、占坑下落、顶补）。操作先停。下一刀阶段 D：长度 6/8/10 档视+震。**

## 新窗口请先读

1. `docs/SPEC.md` — 权威顺序  
2. `docs/OPERATION.md` — 滑动手感（不要改回「谁近加谁」）  
3. `docs/DROP.md` — 阶段 C 占坑 / 0.22 / 整盘锁  
4. `docs/DESIGN.md` — 玩法；无落地自动三消  

## 新窗口第一句（可粘贴）

继续 SlideMatch。先读 `docs/SPEC.md`、`OPERATION.md`、`DROP.md`。阶段 A–C 已完成（手感先停，不要重做操作）。下一刀阶段 D：路径长度 6/8/10 档视+震，过档封顶。对照 DESIGN 反馈段。道具和分数未定点，不要做。

## 阶段

| 阶段 | 状态 |
|------|------|
| A 静盘 | 已做 |
| B 滑动 | 已做；手感见 OPERATION。真机田字格/快划已多轮改，**先不要再改操作** |
| C 消除 + 下落 | **已做**（TripleMatch g/v0/vMax、0.22 占坑、软间距、落地压扁） |
| D 6/8/10 档视+震 | **下一刀** |
| E 道具 / F 分数 | 未定点 |

## 打开

```bash
cd /Users/wangzhixuan/Documents/Threejs_Work/Slidematch
npm run dev          # 默认 5190，被占会失败
# 常用：npx vite --host 127.0.0.1 --port 5301
npm run cap:sync && npx cap open ios   # 打真机
```

iOS 试玩包 **`com.slidematch.phaseb` / SlideMatch B**，不要改回 `com.example.portraitwebgpubase`（会覆盖旧包）。

能看到：桌面背景、九宫框、9×9 点心。可划可退；≥3 抬手消路径、重力占坑下落、顶补；下落中不接新划。调参面板隐藏。

## 玩法（已拍板）

- 9×9、5 色、八向可拐、≥3、仅抬手结算；滑动中不消、不生成道具  
- 无落地后再自动三消  
- 下落：全局重力、`current`+`incoming`、下方空才掉、0.22 释放。见 DROP.md  
- 道具档 6–7 / 8–9 / ≥10 语义在 DESIGN；占格/变色/爆炸形状未定点，C 当普通子  

## 操作要点（细节只信 OPERATION）

按下：`.board-cells` rect，最近格心 ≤ 0.8 格。  
滑动：合批点 + 0.4 格插值；两轴快跳走直角折线；队尾八向+30° 粘滞、过半步才加；先加后减；只退上一格且须在旁。  
禁止：全盘最近格、八邻谁近加谁、supercover 直接加格、`preciseLocation` 进格。

## 代码

```
src/game/path.ts    加/减/插值
src/game/input.ts   第一指、cancel 续划、合批
src/game/drop.ts    current/incoming、0.22 释放、匀速下落、顶补
src/game/mount.ts   rect、喂点、高亮、抬手消、rAF 下落
src/game/board.ts   cellFromLocal / 初盘 ≥3 连通
```

路径只认 `stable`；整盘 dropping/clearing/spawning 不接新划。重力 TripleMatch：150/100 初速、1700、1500、0.22、软间距 0.85、落地压扁。下落中横向压缩 4%、纵向拉伸 8%。

## 硬性

`base: './'` · UI 只挂 `#ui-root` · 禁止 `position: fixed` · 禁止 `setSize(innerWidth)` · 无 WebGPU 明示失败 · 改 Swift 要 `ios:bootstrap`。

## 对照

- TripleMatch：`/Users/wangzhixuan/Documents/XcodeWork/TripleMatch` — 占坑、0.22  
- SlidetoWord：`.../SlidetoWord/portrait-webgpu-base` — 第一指，不抄射线  
- NotebookLM：https://notebooklm.google.com/notebook/01c159a3-b263-45ab-ae06-564996aacb77 （以 SPEC + OPERATION 为准）

## 未定点

道具占格 · 1 级变哪色 · 爆炸形状 · 分数字。对角 X 交叉阶段 B 允许。
