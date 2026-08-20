# 棋盘与美术

舞台 **390×844**。逻辑与视觉分开。运行时默认在 `src/game/settings.ts` 的 `TUNE_DEFAULTS`（可被 `localStorage` `slidematch.tune.v4` 覆盖）。

## 逻辑盘

- 永远 **9×9**。点中、以后的路径只认行列。
- 点中：`.board-cells` 的 `getBoundingClientRect`（已含舞台 scale），最近格心，半径 `cellSize × 0.8`。
- 滑动追加（未做）：尾格心 → 手指，八向。不要用最近矩形格。

## 视觉盘

`#game-board` 是巧克力/浅杏**框外沿**，九宫 `board-frame.png`。  
`.board-cells` 是 9×9 浅格，在框内居中；框大和格大小互不改写。

每个调参只干一件事：

| 参数 | 默认 | 只改 |
|------|------|------|
| 棋盘宽 / 高 | 380 × 380 | 框外沿 |
| 格子间距 | 3 | 格缝 |
| 棋子大小 | 34 | 图标 |
| 格子大小 | 38 | 浅格边长 |
| 格子透明度 | 100 | 浅格图 alpha |
| `FRAME_WIDTH` | 10（代码，无滑条） | 九宫边显示厚度 |
| `FRAME_SLICE` | 40（800² 素材像素） | 切边，一般不动 |

调参面板 `#tune-panel` 现为 **`display: none`**。要调：把 CSS 改回可见。

框相对舞台水平居中，垂直中心再下 **13**。

## 素材（`src/assets/`，PNG 原图，勿再压 JPEG）

| 文件 | 用途 | 尺寸 |
|------|------|------|
| `bg-table.png` | `#stage` 背景 cover | 1536×2752 |
| `board-frame.png` | 大盘框，CSS `border-image` 九宫 | 800×800 |
| `cell.png` | 浅格 | 300×300 |
| `piece-heart.png` | 红 | 700×700 |
| `piece-biscuit.png` | 金 | 700×700 |
| `piece-donut.png` | 蓝 | 700×700 |
| `piece-jelly.png` | 紫 | 700×700 |
| `piece-macaron.png` | 绿 | 700×700 |

颜色第一识别，点心剪影第二。`#stage` 用 `color-scheme: light`，避免暗色方案改饱和度。WebGPU 画布透明、无 tone mapping。

## DOM

```
#stage
  canvas              WebGPU 透明
  #ui-root
    #hud              仅此项 safe padding
    #game-board       视觉框
      .board-pad      九宫框
      .board-cells    逻辑 9×9
    #tune-panel       隐藏
```

相关：[DESIGN.md](./DESIGN.md) · [SWIPE.md](./SWIPE.md)
