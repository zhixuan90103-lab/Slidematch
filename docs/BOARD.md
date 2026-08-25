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
- 用 `<img>` 直出，`object-fit: contain`，`background: none`。
- **禁止** CSS `border-radius` 裁图（圆角只信素材 Alpha）。
- **禁止** 棋子 `box-shadow`（矩形影会垫在透明角下面）。
- 投影：`filter: drop-shadow(0 3px 1px rgba(90, 55, 80, 0.42))`，下投影、小范围，贴 Alpha。
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

设置从 HUD 齿轮打开，叠在 `#settings-root`（`#ui-root` 内，禁止 `position: fixed`）。

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
| `fx-preview/yaw-2d/convert/` | 变色子弹出放大阶段 yaw（00–06、19–23） | 480×438；峰值后切回静图 |
| `piece-magic.png` | 魔法子（金币） | 360×430 透明底 |
| `coin.png` | 金币（独立正面，未接线） | 360×430 透明底 |
| `fonts/Inter-800.woff2` | SCORE / 设置标题 | ExtraBold |

盘面三色：水滴 / 叶 / 太阳。道具：变色 / 魔法。  
`bg-table.png` 不再使用（舞台纯色）。  
旧点心剪影（`piece-biscuit` / `piece-donut` / `piece-jelly` / `piece-macaron`）已删，不要再加回。

颜色第一识别。`#stage` 用 `color-scheme: light`。WebGPU 画布透明、无 tone mapping。

## HUD

| 项 | 值 |
|----|-----|
| 标题 | `SCORE`，Inter 800，15px，字距 0.16em，`#c47ee0` |
| 数字 | Inter 800，46px，`#8f5a3c` |
| 位置 | 顶栏水平居中；右侧设置按钮 |
| 语义 | 累计分；连格 +1 预览，抬手一次滚到取整后的累计（见 DESIGN） |

## 大盘投影

框是矩形九宫，用 `box-shadow: 0 4px 8px rgba(140, 100, 80, 0.42)`。棋子投影见上文「棋子绘制」。

## DOM

```
#stage                         390×844，#fdf1e7
  canvas                       WebGPU 透明，pointer-events:none
  #ui-root                     pointer-events:none
    #hud                       仅此项 safe padding
      .hud-score-wrap          SCORE
      #btn-settings
    #game-board                pointer-events:auto
      .board-pad               九宫框
      .board-cells             逻辑 6×6 浅格
      .board-mask              裁剪窗
        .board-movers          棋子 img
    #settings-root             设置叠层
```

相关：[DESIGN.md](./DESIGN.md) · [SWIPE.md](./SWIPE.md)
