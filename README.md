# SlideMatch

竖屏 **最长路径消除**：**6×6** 滑动连同色，**≥2** 抬手结算。  
底座：TypeScript + Three.js WebGPU + Vite + Capacitor iOS，舞台 **390×844**，底色 `#fdf1e7`。

从 [AGENTS.md](./AGENTS.md) 进。规范地图与当前规格：[docs/SPEC.md](./docs/SPEC.md)。玩法 [docs/DESIGN.md](./docs/DESIGN.md)。道具 [docs/ITEMS.md](./docs/ITEMS.md)。数字 `src/game/design.ts`。

## 上手

```bash
npm install
npm run dev
# 默认 http://127.0.0.1:5190/ ；被占则换端口（本机常用 5301）
```

应看到：奶油舞台、九宫框、6×6 黏土棋子（水滴 / 叶 / 太阳）、薰衣草浅格、顶栏 SCORE。可划、抬手消除、下落。纯普通子够长会出变色子 / 魔法子。齿轮打开设置。

## 文档

| 文档 | 用途 |
|------|------|
| [AGENTS.md](./AGENTS.md) | 第一入口 |
| [docs/SPEC.md](./docs/SPEC.md) | 规范地图 |
| [docs/DESIGN.md](./docs/DESIGN.md) | 玩法 |
| [docs/ITEMS.md](./docs/ITEMS.md) | 道具生成与结算 |
| [docs/BOARD.md](./docs/BOARD.md) | 逻辑/视觉盘、素材、默认参数 |
| [docs/OPERATION.md](./docs/OPERATION.md) | 滑动手感 |
| [docs/DROP.md](./docs/DROP.md) | 占坑与下落（初速 / 加速度 / 上限） |
| [docs/PLAN.md](./docs/PLAN.md) | 阶段 |
| [docs/HAPTICS.md](./docs/HAPTICS.md) | 震动 §0 |
| [docs/AUDIO.md](./docs/AUDIO.md) | 音效方案（未实现） |

## iOS

```bash
npm run ios:bootstrap   # 首次 / 改插件
npm run ios             # build + sync + 打开 Xcode
```

`appId`：`com.slidematch.play`，桌面名 SlideMatch。
