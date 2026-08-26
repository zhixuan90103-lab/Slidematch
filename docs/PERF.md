# 性能 — 检索计划（不改代码）

本文只做**测量与方案检索**。确认瓶颈并写进设计之前，**不要改** `mount.ts` / 资源管线。  
对照：卡顿发生在 **点魔法 / 全盘翻牌 / 金币层**，真机 Safari/WKWebView。桌面流畅不能当过关。

---

## 问题陈述

- 第一次点魔法曾长时间卡死（解码）。现有 `warmupLookAssets()` 只处理「第一次」。
- 第二次及之后仍卡：更像 **每帧工作量**，不是冷启动。
- 尝试过「一块 canvas 画翻牌」：金币对不齐浅格（见真机截图），且仍卡。**已回滚**，不再用这条碰运气。

序列帧打成一张图 **可能** 有用，但是否值得做，必须先测「卡的是哪一类成本」。

---

## 先测什么（顺序固定）

在 **真机**（与截图同一台）打开 Safari Web Inspector / Xcode GPU。只记数字，不改玩法。

| # | 场景 | 看什么 | 若成立则指向 |
|---|------|--------|----------------|
| 1 | 进局空闲 3s | 主线程 / 合成帧时长、图层数 | 底噪：DPR 放大的 36 张 `img` + `drop-shadow` |
| 2 | 第一次点魔法 | `decode`、PNG 解码、`img.src` 首次赋值 | 预热是否覆盖全部 `yaw-2d` + `coin.png` |
| 3 | 第二次点魔法（预热已完） | 200ms 内每帧：`syncPieceEl`、style 写入、合成 | **换 `src` / 滤镜 / 图层提升** |
| 4 | 金币出场 400ms | 36 张 overlay + 底板同时换帧 | DOM 节点数 × 滤镜 |
| 5 | 无效抬手翻回 300ms | 同上，反向 | 与正向是否同一成本 |
| 6 | 有效抬手飞金币 | 克隆 img、飞层、yaw 循环 | 飞金币是否另一条卡点 |
| 7 | 普通换锁色（路上 6～12 子，非全盘） | 对比全盘 | 成本是否 ≈ 翻的子数 |

每场景记：最长帧 ms、掉帧次数、主线程 vs 合成线程、是否伴随图层创建。

**过关线（检索用，不是承诺）：** 第二次点魔法翻牌段，真机 90% 帧 &lt; 16.7ms；允许第一次进局预热掉 1～2 帧。

---

## 当前实现里已知成本（待数据确认）

来源：`syncPieceEl`（`mount.ts`）、`PIECE_DRAW`、`yaw-2d/*`（约 **109** 张独立 PNG）。

1. **每帧 `img.src` 换 yaw 帧**  
   全盘魔法 = 最多 36 底板 + 36 金币 + 选中 glow。浏览器可能每换一帧就当新图上传合成器。  
   预热 decode **不消除** 这一步。

2. **`drop-shadow` 滤镜**  
   `setPieceBitmapSize` 每子每帧设滤镜；位图还按 DPR（上限 3）放大。滤镜在合成线程很贵，36×2 更贵。

3. **独立 PNG 数量**  
   每种外观 7+5 帧，外加静图。HTTP/缓存/解码次数多；打 atlas 主要减这个，**不自动减每帧换图**。

4. **图层爆炸**  
   每张 `img` + `translate3d` 常变成独立合成层。翻牌时层上再上传纹理。

5. **双路径绘制**  
   `movers` / `lifts` 两套宿主；金币 overlay 与底板各一套 transform。

6. **未证实**  
   WebGPU 空转、`tickDrop`、分数滚动。先用 profiler 排除，再动棋子贴图。

---

## 方案检索（先排队，后动手）

每一项：只在「对应测量行成立」时才进入设计。禁止并行改多条。

### A. 序列帧打成一张图（你问的）

| | |
|--|--|
| 做什么 | 每种外观一张横条/网格：`drop` / `leaf` / … / `magic_bai` / `coin` 各 atlas。运行时 **一张** `ImageBitmap`，用 `drawImage` 裁帧或 CSS `background-position`。 |
| 能减 | 解码次数、请求数、GPU 纹理切换、缓存碎片。 |
| 不能单独减 | 若仍给 72 个 DOM `img` 每帧改 `src`/`background`，卡顿可能还在。 |
| 风险 | 切片要对齐现有 7+5；透明边；Capacitor 包体变大或变小（视压缩）。 |
| 前置测量 | #2 解码占比高，或 #3 里「纹理上传」高。 |

**结论倾向：** atlas 值得做，但是 **第二步**。第一步应先让「已解码的同一张位图」在翻牌时不要走 72 次 `src` 赋值。

### B. 冻结 `src`，只改可见帧的引用方式

同一 `HTMLImageElement` 不改 `src`；帧来自 atlas 的 UV，或 `createImageBitmap` 数组 + 一块棋盘 canvas。  
前置：#3 主因是 `src` 赋值 / 图层失效。  
**已否决本轮：** 手写 canvas 对不齐格子。若再走 canvas，必须先有「与 DOM 棋子同一套坐标」的验收（截图像素对比浅格中心）。

### C. 翻牌期间关掉 `drop-shadow`

翻 200/300ms 内 `filter: none`，停稳再开。  
前置：#1/#3 合成线程高、主线程不高。  
改动面小，但是要写进 `FEEDBACK.md`（投影是否允许短暂消失）。

### D. 降 DPR / 阴影只画进 PNG

`dprMax` 3 在 iPhone 上是 36 张超大位图。阴影 bake 进素材则运行时无滤镜。  
前置：#1 空闲也卡、或滤镜占比高。  
Bake 阴影要改素材规范（`BOARD.md` / `PIECE_DRAW`），先设计再改图。

### E. 金币层不要 36 个独立 `img`

共用一张金币纹理 + 实例化（canvas / 单个 sprite sheet + 位置数组）。  
前置：#4 金币段明显比只有底板更卡。

### F. 错开上传

每帧最多改 N 张 `src`（与切比雪夫圈对齐）。观感会「更一圈一圈」，可能可接受。  
前置：#3 成立且暂时不做 atlas。属于权宜，不是目标形态。

---

## 明确不做（本计划内）

- 再随手改 `mount.ts` 坐标/canvas 合成。
- WebGL 回退、把棋子改成 Three.js mesh（底座是 WebGPU 空转 + DOM 棋子，换渲染器是另一项目）。
- 为流畅改翻牌时长、帧数、缩放曲线（那是手感，不是性能检索）。
- 同时上 A+B+C+D。

---

## 交付物（检索结束时）

1. 真机表：场景 1–7 的最长帧、主/合成占比、图层数。  
2. 一条主因（只选上面 A–F 的一条当第一刀）。  
3. 若选 A：atlas 规格草案（帧序 00–06+19–23、padding、谁出图）。  
4. 验收：第二次点魔法 + 截图金币必须落在浅格中心（对 [Image] 那种错位零容忍）。

**对象池：** 进局预建 36 金币 overlay + 36 飞金币 + 36 glow + 12 备用棋子，停用只 `opacity:0` 挪走，不 `hidden` / 不 `remove()`。第一次点魔法不要现造 36 层。

---

## 检索记录（2026-08-26）

环境：静态代码 + 资源盘点。**没有**接到与截图同一台 iPhone 的 Web Inspector，场景 1–7 的「最长帧 ms」表空着，不能拿桌面帧时冒充过关。

### 已排除

| 项 | 依据 |
|----|------|
| WebGPU 每帧提交 | `main.ts`：`setAnimationLoop(null)`，只 `render` 一次 |
| 下落/分数空转 | `loop` 仅在 dropping / popping / recoloring 等为真时 `paintPieces`；空闲会停 rAF |
| 合图预览条打进包 | `import.meta.glob` 只吃 `yaw-2d/*/*_yaw_*.png`。`sun-yaw-2d/sun_yaw_strip.png` 等在仓库里（单张 2MB+），**运行时未引用** |

### 资源账

| | |
|--|--|
| 运行时 yaw | 9 套 × 12 帧（00–06 + 19–23），均为 **360×430** |
| 磁盘 | yaw 约 **17.4MB**（9 套）；`coin.png` 147KB；静图棋子各 ~170–190KB |
| 解码后理论 | 360×430×4 ≈ **0.59MB/帧**；魔法只用 `magic_bai`+`coin` = 24 帧 ≈ **14MB**；9 套全解 ≈ **64MB** |
| 显示 | CSS 子宽 56；再 ×DPR（上限 **3**）→ 位图约 168×201，且 `will-change: transform` |

`warmupLookAssets`：每批 6 张 `decode` + 8×8 `drawImage`，**不持有** `Image` 引用。批结束后位图可被 GC。预热只能帮「磁盘/解码缓存还在」的第一次，**不能保证第二次零解码**。

### 每帧工作（魔法全盘，代码计数）

`syncPieceEl` 对 **每个** 棋子每帧都写：

- `width` / `height` / `filter: drop-shadow(...)`（`setPieceBitmapSize`，无脏检查）
- `transform`（`translate3d` + 绕心缩放）
- `classList`、`zIndex`、`opacity`
- `el.src` 当 yaw 帧号变了

时间轴：

| 段 | 时长 | 帧序列 | 约每 visync 换 `src` |
|----|------|--------|----------------------|
| 底板翻出 | 200ms | 12 帧 | **每 16.7ms 一帧** ≈ 每显示帧都换 |
| 切比雪夫圈 | 每圈 50ms | 最多 6 圈 | 峰值仍是 36 底板同时换 |
| 金币 | 晚 100ms，播 400ms | 12 帧 | 约每 33ms 换；叠加底板 |
| 翻回 | 300ms | 12 帧 | 略慢于正向，仍是全盘 |

峰值 DOM：36 底板 + 36 金币 overlay（`.is-coin-overlay` 仍走同一套 `drop-shadow`）+ 路径 glow。  
`.board-piece` 长期 `will-change: transform` + `backface-visibility: hidden` → 空闲也倾向 **36 张合成层**；点魔法再翻倍。

换锁色（场景 7）只翻路径 6–12 子，层数约为魔法的 1/3～1/6。若真机「换锁色顺、点魔法卡」，主因就是 **层数 × 换 src**，不是通用 JS。

### 场景表（真机 Capacitor，第一次点魔法）

| # | max | p90 | avg | jsMax | imgs | 读 |
|---|-----|-----|-----|-------|------|----|
| 1 idle | 43 / 25 | 17 | 16.7 | 1–2 | 37–43 | 空闲就是 60Hz。`drop-shadow` + 36 张静图 **不够卡** |
| drop | 17–26 | 17 | 16.6 | 2 | 36 | 下落顺 |
| 2–3 magic_flip tap=1 | **47** | **39** | **19.9** | **2** | **73** | 翻牌 20 帧几乎帧帧掉到 ~39ms。JS 只有 2ms → **合成/换 `src`** |
| 4 magic_coin | 61 | **17** | 16.8 | 4 | 106 | 停在金币静图后，106 张带滤镜也 **p90=17**。max=61 是切段尖峰 |
| 6 score_fly | 44 | 19 | 16.9 | 2 | 104 | 起飞一下，比翻牌轻 |
| 5 翻回 / 7 换锁色 | *本次无* | | | | | 下一次补 `convert` + `magic_back` + tap=2 |

主因：**不是 JS，不是投影本身，是翻牌那 200ms 每帧换 `src`。** 静图 36 或 106 张都 16.7ms；一换帧 p90 就到 39。

### 合图（A）单独够不够？

不够。atlas 减的是 **解码次数和绑纹理次数**。若仍是 72 个 `<img>` 每帧改 `src` 或 `background-position` 并带 `drop-shadow`，合成税还在。仓库里已有 `sun_yaw_strip.png`（11520×438），说明合图管线存在，**游戏没用**。

合图要有效，必须配「**不改 `src`**」：一张图裁帧（CSS `background-position` 或 `object-position`），**继续用现有 `pieceLayerTransform`**，避免再走对齐失败的整盘 canvas。

### 第一刀（检索结论，未开工）

**只做魔法两套 atlas：`magic_bai` + `coin`（各 12 帧横条，360×430，帧序 00–06 然后 19–23）。底板/金币仍是现在的 DOM 节点，用 `background-position` 换帧，transform/坐标零改动。**

对应 A 的最小切片 + B 的「冻结 src」。C（关投影）本次真机已否：idle/magic_coin 都带着 `drop-shadow` 且 p90=17。  
不做 9 色一起合、不重做整盘 canvas。换锁色/第二次点魔法仍缺一行日志，不挡第一刀（翻牌段已经自证）。

验收仍是：金币中心 = 浅格中心（禁止再出现整盘错位截图）。

### 真机日志（已接）

无远程后台。场景**结束**打一行 `[perf]` 到 Safari/Xcode 控制台，并写入 `sessionStorage.slidematch.perfLog`。

`?debugPerf=1`：左下角叠最后几行，点一下复制。

字段：`scene` `n` `max` `p90` `avg`（rAF 间隔 ms）`jsMax`（`paintPieces` 那段 JS ms）`imgs` / `coins` / `recs`（DOM 层代理）`tap`（第几次进 `magic_flip`）。

场景：`idle`（进局约 3s）`convert` `magic_flip` `magic_coin` `magic_back` `score_fly` `drop`。

把控制台里带 `[perf]` 的行发回来即可。图层是 **img 个数**，不是 Safari 合成层真值。

