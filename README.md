# SlideMatch

竖屏 **最长路径消除**：9×9 滑动连同色，抬手结算。  
底座：TypeScript + Three.js WebGPU + Vite + Capacitor iOS，舞台 **390×844**。

从 [AGENTS.md](./AGENTS.md) 进。[docs/DESIGN.md](./docs/DESIGN.md) 是玩法真源。

## 上手

```bash
npm install
npm run dev
# 默认 http://127.0.0.1:5190/ ；被占则换端口（本机常用 5301）
```

应看到：烘焙桌面背景、浅杏九宫框、9×9 点心棋子（心 / 饼 / 圈 / 冻 / 马卡龙）。点格会高亮。还不能划消。  
调参面板默认隐藏。

## 文档

| 文档 | 用途 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 第一入口 |
| [docs/DESIGN.md](./docs/DESIGN.md) | 玩法 |
| [docs/BOARD.md](./docs/BOARD.md) | 逻辑/视觉盘、素材、默认参数 |
| [docs/SWIPE.md](./docs/SWIPE.md) | 滑动（未实现） |
| [docs/DROP.md](./docs/DROP.md) | 下落（未实现） |
| [docs/PLAN.md](./docs/PLAN.md) | 阶段 |
| [docs/HAPTICS.md](./docs/HAPTICS.md) | 震动 §0 |
| [docs/AUDIO.md](./docs/AUDIO.md) | 音效方案（未实现） |

## iOS

```bash
npm run ios:bootstrap   # 首次 / 改插件
npm run cap:sync
```

`appId` 仍是 `com.example.portraitwebgpubase`。
