# 棋盘与美术

舞台 **390×844**，底色 `#fdf1e7`。逻辑与视觉分开。  
设计数字真源：`src/game/design.ts` 的 `LOOK` / `ART` / `GRID` / `PIECE_DRAW`。设置面板可临时覆盖 `LOOK`（`localStorage` `slidematch.tune.v16`），「恢复默认」回到设计值。权威顺序见 [SPEC.md](./SPEC.md)。

## 逻辑盘

- 永远 **6×6**。点中、以后的路径只认行列。
- 点中：`.board-cells` 的 `getBoundingClientRect`（已含舞台 scale），最近格心，半径 `min(cellW, cellH) × 0.8`。
- 滑动追加：队尾四邻，过共享边或进格；不要用全盘最近格。见 [SWIPE.md](./SWIPE.md) · [OPERATION.md](./OPERATION.md)。

## 视觉盘

`#game-board` 是奶油/薰衣草**框外沿**，九宫 `board-frame.png`。  
`.board-cells` 是 6×6 浅格，在框内居中；框大和格大小互不改写。  
`.board-mask` 裁掉框外/顶补棋子。棋子在 `.board-movers` 里，`translate3d`，对象池复用。

格子与棋子同一长宽比 **360×430**。两个「大小」都指**宽度**，高度 = 宽 × 430/360。默认格子略大于棋子。

## 棋子绘制

数字真源：`src/game/design.ts` 的 `PIECE_DRAW`。

- 棋子 PNG 是 **实心黏土圆角牌 + 图标**，只有四角全透明，不是镂空剪影。
- 静图：`piece-*.png` / `coin.png`。翻牌 yaw：`src/assets/fx-preview/yaw-2d/<套>/yaw_strip.png`（**13 格**：00–06+19–23 再加末格静图）。运行时只 import 横条。
- 棋子是 `div.board-piece` + `background-position` 裁帧，不是每帧换 `<img src>`。`overflow: hidden` 裁到一格。
- 魔法另两层 overlay（白板 `magic_bai`、金币 `coin`），与路径角标均进局预铺 36；不用 `opacity: 0`，不要拆层。
- 重打横条：`python3 scripts/pack-yaw-atlas.py`（要 ffmpeg）。

- **禁止** CSS `border-radius` 裁图（圆角只信素材 Alpha）。
- **禁止** 棋子 `box-shadow`（矩形影会垫在透明角下面）。
- 投影：`filter: drop-shadow(0 3px 1px rgba(90, 55, 80, 0.42))`，下投影、小范围，贴 Alpha。其它色变暗时关投影，松手 100ms 淡入。
- 清晰：合成层位图按 `devicePixelRatio` 放大（上限 3）再 `scale(1/dpr)` 回布局大小；落地挤压仍绕底边中心。
- Mask 只切画出大盘的顶补，不切单颗素材。

| 参数 | 默认 | 只改 |
|------|------|------|
| 棋盘宽 / 高 | 380 × 450 | 框外沿 |
| 格子间距 | 0 | 格缝 |
| 棋子大小 | 56（宽）→ 56×67 | 图标，不裁切 |
| 格子大小 | 60（宽）→ 60×72 | 浅格 |
| 格子透明度 | 15 | 浅格图 alpha |
| Mask 内缩 / 圆角 | 7 / 5 | 棋子裁剪窗 |
| 初速度 | 600 px/s | 少格 |
| 加速度 | 1400 px/s² | 多格加速 |
| 速度上限 | 1600 px/s | 太长顶住 |
| `FRAME_SLICE` | 48 | 素材切片（圆角+内沿） |
| `FRAME_SCALE` | 0.4 | 切片 → 显示 ≈ 19px |

框相对舞台水平居中，垂直中心再下 **13**。

调参面板 `#settings-root` 在 `#ui-root` 内（禁止 `position: fixed`），左下弹出。局内 **设置按钮隐藏**。可调盘面/下落，以及 HUD：高度、边距、标题/分数字号与高低、金币数字上限、金币图标大小。金币图标 XY 钉死不进设置。存档 `slidematch.tune.v21`。

## 素材（`src/assets/`，PNG 原图，勿再压 JPEG）

| 文件 | 用途 | 尺寸 |
|------|------|------|
| `board-frame.png` | 大盘框，CSS `border-image` 九宫 | 原图像素；slice 48 |
| `cell.png` | 浅格（圆角薰衣草） | 360×430 透明底 |
| `piece-drop.png` | 蓝水滴 | 360×430 透明底 |
| `piece-leaf.png` | 绿叶 | 360×430 透明底 |
| `piece-sun.png` | 橙太阳 | 360×430 透明底 |
| `piece-heart.png` | 粉心（包内有，盘面不用） | 360×430 透明底 |
| `piece-star.png` | 紫星（包内有，盘面不用） | 360×430 透明底 |
| `piece-convert.png` | 变色子静图（彩虹漩涡糖） | 360×430 透明底 |
| `fx-preview/yaw-2d/convert/` | 变色子弹出放大阶段 yaw（00–06、19–23） | 360×430；峰值后切回静图 |
| `fx-preview/yaw-2d/magic/` | 魔法子弹出放大阶段 yaw（00–06、19–23） | 360×430；峰值后切回静图 |
| `fx-preview/yaw-2d/{drop,leaf,sun}/` | 换锁色翻牌 yaw | 360×430，与静图同画幅 |
| `piece-magic.png` | 魔法子（金币） | 360×430 透明底 |
| `coin.png` | 魔法滑动叠在白板上的金币正面 | 360×430 透明底 |
| `fx-preview/yaw-2d/magic_bai/` | 魔法滑动全盘白板 yaw（00–06、19–23） | 360×430；翻完用 00 当静图 |
| `hud-panel.png` | HUD 分数 / 金币底板，CSS `border-image` 九宫 | 200×200；slice 52 |
| `fonts/Inter-800.woff2` | SCORE / 设置标题 | ExtraBold |

盘面开局三色：水滴 / 叶 / 太阳。顶补可到心 / 星（用完魔法后 ±1 色种，见 ITEMS）。道具：变色 / 魔法。  
`bg-table.png` 不再使用（舞台纯色）。  
旧点心剪影（`piece-biscuit` / `piece-donut` / `piece-jelly` / `piece-macaron`）已删，不要再加回。

颜色第一识别。`#stage` 用 `color-scheme: light`。WebGPU 画布透明、无 tone mapping。

## HUD

数字真源：`src/game/design.ts` 的 `HUD`（布局）+ `FEEL.convert.scoreFly*`（飞币）。

| 项 | 值 |
|----|-----|
| 标题 | `COINS` / `SCORE`，Inter 800，**20px**，字距 0.14em，`#c47ee0`；高低 `labelY` **25** |
| SCORE 数字 | Inter 800，**45px**，`#8f5a3c`；高低 `scoreY` **15** |
| COINS 数字 | 上限 **36px**，同色；在图标右侧槽里居中；位数多了自适应缩小，不画出底板、不压图标 |
| 布局 | 左方 **130×130**、右长条同高拉满；边距 = 两栏间距 **14** |
| 底板 | `hud-panel.png` 九宫一层（`::before`）；投影 `drop-shadow(0 2px 2px rgba(140,100,80,0.32))` 贴 Alpha。禁止再加圆角 `box-shadow`（会看成两层） |
| 金币图标 | 高 **45**、宽按 360×430 ≈ **38**。相对「图标+一位数字」居中组再微移 `coinIconX` **-8**、`coinIconY` **15**。位置钉死 |
| 本局金币 | 仅魔法有效抬手，路径每格 +1。飞币打中图标才 rolling；逻辑累计抬手时已记 |
| 飞币 | 终点对准 HUD 图标中心，大小 = 图标 × **0.55**。路程 **62%** 起淡出，到达时已透明。每枚打中：图标 punch 1.22 / 0.14s，数字 ease-out 跟上 |
| 设置 | 按钮隐藏；面板代码仍在 |

## 大盘投影

框是矩形九宫，用 `box-shadow: 0 4px 8px rgba(140, 100, 80, 0.42)`。棋子投影见上文「棋子绘制」。

## DOM

```
#stage                         390×844，#fdf1e7
  canvas                       WebGPU 透明，pointer-events:none
  #ui-root                     pointer-events:none
    #hud                       仅此项 safe padding
      .hud-coins.hud-panel     COINS（方）
      .hud-score-wrap.hud-panel SCORE（长条）
    #game-board                pointer-events:auto
      .board-pad               九宫框
      .board-cells             逻辑 6×6 浅格
      .board-mask              裁剪窗
        .board-movers          棋子 img
    #settings-root             设置叠层
```

相关：[DESIGN.md](./DESIGN.md) · [SWIPE.md](./SWIPE.md)
