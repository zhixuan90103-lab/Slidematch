# 棋盘与美术

舞台 **390×844**。逻辑与视觉分开。运行时默认在 `src/game/settings.ts` 的 `TUNE_DEFAULTS`（可被 `localStorage` `slidematch.tune.v4` 覆盖）。

## 逻辑盘

- 永远 **6×6**。点中、以后的路径只认行列。
- 点中：`.board-cells` 的 `getBoundingClientRect`（已含舞台 scale），最近格心，半径 `cellSize × 0.8`。
- 滑动追加：队尾指向手指的八向（粘滞），沿该向过半步；不要用全盘最近格。见 [SWIPE.md](./SWIPE.md)。

## 视觉盘

`#game-board` 是巧克力/浅杏**框外沿**，九宫 `board-frame.png`。  
`.board-cells` 是 6×6 浅格，在框内居中；框大和格大小互不改写。

每个调参只干一件事：

| 参数 | 默认 | 只改 |
|------|------|------|
| 棋盘宽 / 高 | 380 × 455 | 框外沿 |
| 格子间距 | 0 | 格缝 |
| 棋子大小 | 65 | 图标（高，宽随 360×430） |
| 格子大小 | 60 | 浅格宽（高随同一比例） |
| 格子透明度 | 100 | 浅格图 alpha |
| `FRAME_WIDTH` | 48 × 0.4 ≈ 19 | 切片显示比例 |
| `FRAME_SLICE` | 48（600²） | 奶油圆角+内沿 |

调参面板 `#tune-panel` 现为 **`display: none`**。要调：把 CSS 改回可见。

框相对舞台水平居中，垂直中心再下 **13**。

## 素材（`src/assets/`，PNG 原图，勿再压 JPEG）

| 文件 | 用途 | 尺寸 |
|------|------|------|
| `bg-table.png` | `#stage` 背景 cover | 1536×2752 |
| `board-frame.png` | 大盘框，CSS `border-image` 九宫 | 800×800 |
| `cell.png` | 浅格 | 300×300 |
| `piece-drop.png` | 蓝水滴 | 360×430 透明底 |
| `piece-leaf.png` | 绿叶 | 360×430 透明底 |
| `piece-sun.png` | 橙太阳 | 360×430 透明底 |
| `piece-heart.png` | 粉心 | 360×430 透明底 |
| `piece-star.png` | 紫星 | 360×430 透明底 |

颜色第一识别，点心剪影第二。`#stage` 用 `color-scheme: light`，避免暗色方案改饱和度。WebGPU 画布透明、无 tone mapping。

## DOM

```
#stage
  canvas              WebGPU 透明
  #ui-root
    #hud              仅此项 safe padding
    #game-board       视觉框
      .board-pad      九宫框
      .board-cells    逻辑 6×6
    #tune-panel       隐藏
```

相关：[DESIGN.md](./DESIGN.md) · [SWIPE.md](./SWIPE.md)
