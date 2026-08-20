# AGENTS.md — SlideMatch

> 打开本仓库的第一入口。底座是竖屏 WebGPU + Capacitor；玩法是最长路径消除。

## 一句话

**TypeScript + Three.js WebGPU + Vite + Capacitor iOS**，设计空间 **390×844** contain letterbox。  
玩法：9×9 滑动连同色，抬手消除。规范见 `docs/DESIGN.md`。

## 文档

| 文件 | 内容 |
|------|------|
| [docs/HANDOFF.md](./docs/HANDOFF.md) | 窗口交接 |
| [docs/DESIGN.md](./docs/DESIGN.md) | 玩法（第一真源） |
| [docs/BOARD.md](./docs/BOARD.md) | 逻辑 9×9 / 视觉框 / 素材 |
| [docs/SWIPE.md](./docs/SWIPE.md) | 可拐弯路径（不抄射线） |
| [docs/SWIPE-RESEARCH.md](./docs/SWIPE-RESEARCH.md) | 滑动检索备忘（不覆盖规则） |
| [docs/DROP.md](./docs/DROP.md) | 格子占坑、重力 |
| [docs/PLAN.md](./docs/PLAN.md) | 阶段 A–F |
| [docs/SOURCES.md](./docs/SOURCES.md) | 对照工程与权威顺序 |
| [docs/ENGINEERING.md](./docs/ENGINEERING.md) | 底座约定 |
| [docs/ENTRYPOINTS.md](./docs/ENTRYPOINTS.md) | 启动链 |
| [docs/HAPTICS.md](./docs/HAPTICS.md) | 震动接入 §0 |
| [docs/AUDIO.md](./docs/AUDIO.md) | 音效方案（未实现） |

## 入口地图

| 职责 | 文件 |
|------|------|
| Web 启动 | `index.html` → `src/main.ts` |
| 静盘 | `src/game/config.ts` · `settings.ts` · `board.ts` · `mount.ts` · `src/assets/` |
| 设计舞台 | `src/adapt/design.ts` |
| 设备预览 | `src/adapt/devicePreview.ts` |
| Safe Area | `src/adapt/safeArea.ts` + `#hud` 的 padding |
| 禁网页手势 | `src/adapt/lockGestures.ts` |
| WebGPU 底 | `src/create-renderer.ts` |
| 震动 | `src/utils/haptics.ts` · `docs/HAPTICS.md` §0 |
| Capacitor | `capacitor.config.ts`（`contentInset: never`） |
| 构建 | `vite.config.ts`（**`base: './'`**，端口 **5190**） |

## DOM（勿拆）

```
#shell > #viewport > #app > #stage
  canvas          ← WebGPU，pointer-events:none
  #ui-root        ← pointer-events:none
    #hud          ← 仅此处加 safe padding
    #game-board   ← 视觉框 + 逻辑格，pointer-events:auto
#device-switcher  ← 仅桌面预览
```

棋盘不要吃 `#ui-root` 的 flex / 全铺 safe padding。

## 硬性约定

1. **`vite` `base: './'`**  
2. **`webDir: dist`** 与 Vite `outDir` 一致  
3. **`ios.contentInset: never`** — Safe Area 只走 CSS  
4. **布局坐标 390×844**；禁止 `renderer.setSize(window.innerWidth,…)`  
5. **UI 只挂 `#ui-root`**；禁止玩法 UI `position: fixed`  
6. **Pad 只改外层视口**，不改 `DESIGN_*`  
7. 改 Swift 改 `plugins/native-haptics/` 再 `ios:bootstrap`；不要用 JS `prepare()` 判断是否接上  
8. **无 WebGPU 则明确失败**，不静默 WebGL  
9. 盘内点中用棋盘 **DOM rect**；追加路径用尾格心→八向  

## 命令

```bash
npm install
npm run dev           # http://127.0.0.1:5190/  （被占时换端口）
npm run build
npm run cap:sync
npm run ios:bootstrap
npm run ios
```

`?preview=0|1` · `?debugFit=1`  
`document.body.classList.add('debug-safe-area')`

## 业务

- 玩法只加 `src/game/*`  
- 保留 adapt / create-renderer / haptics / plugins / `base`  
- 音效按 `docs/AUDIO.md`；禁止热路径 `new Audio()`  

## 刻意不做

- Android  
- WebGL 静默回退  
- 未定点的道具（见 DESIGN）  
