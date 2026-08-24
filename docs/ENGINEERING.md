# Engineering — 底座

配套：[AGENTS.md](../AGENTS.md) · [ENTRYPOINTS.md](./ENTRYPOINTS.md) · [DESIGN.md](./DESIGN.md) · [AUDIO.md](./AUDIO.md) · [HAPTICS.md](./HAPTICS.md)

## 1. 定位

竖屏 WebGPU + Capacitor 底座，上面是 SlideMatch。能 dev、build、真机、震动；桌面可切手机/Pad。玩法不写在本文。

## 2. 目录

```
Slidematch/
├── AGENTS.md
├── README.md
├── docs/                   # DESIGN BOARD SWIPE DROP PLAN …
├── src/
│   ├── main.ts
│   ├── create-renderer.ts
│   ├── game/               # design config settings board mount path drop
│   ├── assets/             # 框 / 浅格 / 五子 PNG / Inter
│   ├── adapt/
│   └── utils/haptics.ts
├── plugins/native-haptics/
└── scripts/bootstrap-ios.mjs
```

## 3. 配置表

### Vite

| 项 | 值 | 原因 |
|----|-----|------|
| `base` | `'./'` | Capacitor 相对路径 |
| `outDir` | `dist` | = webDir |
| `port` | `5190` | 固定端口 |
| `target` | `es2022` | WebGPU |

### Capacitor

| 项 | 值 |
|----|-----|
| `appId` | `com.slidematch.play` |
| `webDir` | `dist` |
| `ios.contentInset` | `never` |
| `ios.scrollEnabled` | `false` |
| `ios.backgroundColor` | `#fdf1e7` |

### 设计尺寸

| 常量 | 值 |
|------|-----|
| DESIGN_WIDTH / HEIGHT | 390 / 844 |
| DESIGN_SAFE top/bottom | 59 / 34（桌面模拟） |
| Phone 预览 | 390×844 |
| Pad 预览 | 768×1024（外层视口） |

舞台设计尺寸在 `src/adapt/design.ts`。盘面/棋子数字在 `src/game/design.ts`。改舞台时同步 `style.css` 的 `#stage` 宽高。

## 4. 适配算法

```
scale = min(viewW/390, viewH/844)   // contain
offset = 居中
#stage transform: translate(offset) scale(scale)
renderer.setSize(390, 844)          // 始终设计分辨率
```

盘内点中：棋盘元素 `getBoundingClientRect`（已含 scale）。letterbox 外忽略。

## 5. Safe Area

| 环境 | 行为 |
|------|------|
| 桌面 | JS 写入 `--safe-*` = DESIGN_SAFE |
| 原生 | CSS `env(safe-area-inset-*)` |
| HUD | `#hud` padding = safe + ui-pad |
| 棋盘 | `#stage` 绝对坐标，**不加** ui-root 全铺 padding |

3D/底可全出血；可点 UI 在 `#ui-root` 里把对应节点设为 `pointer-events: auto`。

## 6. WebGPU

- `createRenderer` → `three/webgpu` WebGPURenderer，`alpha: true`，`NoToneMapping`  
- `scene.background = null`，舞台底色走 CSS `#stage`（`#fdf1e7`）  
- 无 `navigator.gpu` / init 失败 → `showFatal`  
- 渲染器 DPR cap 默认 2；**棋子 DOM 位图**另按 `PIECE_DRAW.dprMax`（3）放大，见 [BOARD.md](./BOARD.md)  
- 空闲停 WebGPU 循环（`needsTick`）  
- 禁止 `setSize(innerWidth, innerHeight)` 跟窗走  

## 7. Haptics

接线规范：[HAPTICS.md](./HAPTICS.md)

真源：`plugins/native-haptics/`  
JS：`src/utils/haptics.ts`（`registerPlugin('AdvancedHaptics')`）  
注册：`BridgeViewController.capacitorDidLoad`（**必须** `ios:bootstrap`，只 `cap:sync` 不够）

Swift **没有** `prepare`；引擎在 `load()` 启动。不要用 JS `prepare()` 判断是否接上。  
业务节奏（具名事件、cooldown、开关）写在游戏层，不要改插件除非新增原生方法。

## 7b. Audio（尚未实现）

本仓库无播放代码。接入规范见 [AUDIO.md](./AUDIO.md)：

- Loading **预解码**；热路径禁止 `new Audio()` / decode / 读盘
- `AudioBatcher`：**每帧最多一次** Capacitor 桥
- iOS 生产走 `AVAudioEngine` + PCM 缓存 + PlayerNode 池；**禁止**静默 WebAudio
- Catalog 管 cooldown / priority / maxVoices；忙帧再砍每帧条数

## 8. iOS 工作流

```bash
# 首次
npm install && npm run ios:bootstrap && npm run cap:open

# 日常
npm run cap:sync
```

## 9. 已知坑

1. **不要**把 `base` 改回 `'/'`  
2. **不要** `contentInset: automatic`（双重 inset）  
3. Pad 预览禁止横向拉满 390 UI  
4. pbxproj 优先 bootstrap，少手改  
5. `dist` / `ios/.../public` 是产物  
6. appId 用 `com.slidematch.play`，不要改回脚手架 id  
7. 震动没接上：先看 [HAPTICS.md §0](./HAPTICS.md)，不要只 `cap:sync`，不要用 `prepare()` 当验收  
8. 棋盘坐标是 `#stage` 的 10.5 / 250.5，不要再套一层 safe padding  

## 10. 变更

| 日期 | 说明 |
|------|------|
| 2026-08-21 | 规格冻结：6×6、≥2、LOOK/PIECE_DRAW；黏土五子 + 下投影；文档对齐 |
| 2026-08-20 | 烘焙美术、视觉/逻辑盘分离、调参默认 380 盘 |
| 2026-08-19 | 玩法文档落地；静盘阶段 A |
