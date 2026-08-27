# 实施计划

权威：[DESIGN.md](./DESIGN.md) · [ITEMS.md](./ITEMS.md) · [FEEDBACK.md](./FEEDBACK.md) · [BOARD.md](./BOARD.md) · [SWIPE.md](./SWIPE.md) · [DROP.md](./DROP.md) · `src/game/design.ts`

| 阶段 | 结果 | 状态 |
|------|------|------|
| A | 6×6 静盘 + 黏土美术 + 视觉/逻辑分离 | **已做** |
| B | 四向可拐弯划、回退、&lt;2 取消 | **已做** |
| C | 抬手消、占坑下落、顶补、静止子可划；运动初速/加速度/上限 | **已做** |
| D | 长度 6/8/10 档视+震，封顶 | 未做 |
| E | 道具 | **变色子 + 魔法子已做**（表现见 FEEDBACK）；按钮式全盘清不做 |
| F | 分数公式 | **已做**（连格小额预览、抬手 n² 倍率、HUD 滚动） |

## 阶段 A 已落地

- 底座：390×844、contain、透明 WebGPU、舞台 `#fdf1e7`  
- 美术：框九宫、薰衣草浅格、黏土牌 PNG（360×430；盘面水滴 / 叶 / 太阳）  
- HUD：左 COINS + 右 SCORE（九宫底）  
- 调参：覆盖 `LOOK` / `HUD`，默认即设计；左下齿轮  

## 代码

```
src/game/design.ts     LOOK / ART / GRID / RULES / FEEL / HUD / PIECE_DRAW / `stepColorCount`
src/game/config.ts     行列、框切片、yaw 横条、warmup
src/game/perfLog.ts    真机帧时日志
src/game/pathBadge.ts  路径角标出现/队尾缩放/消失
src/game/items.ts      道具生成与结算
src/game/score.ts      累计分 / n² / 道具倍率
src/game/clearFx.ts    消除碎屑
src/game/settings.ts   调参与 layout
src/game/board.ts      点中、初盘保证 ≥ PATH_MIN 连通
src/game/mount.ts      DOM、选中、角标、合成飞入、魔法三层、脏格子 rAF
src/game/convertLook.ts 换锁色 / 魔法白板显示
src/game/scoreFly.ts   魔法金币飞向 HUD 图标
src/assets/            见 BOARD.md
```

阶段 B：`path.ts` + `input.ts`。阶段 C：`drop.ts` + `mount.ts` + `clearFx.ts`。阶段 E：`items.ts` + FEEDBACK。阶段 F：`score.ts`。震动：`FEEL.haptic` + `haptics.ts`。下一刀阶段 D：6/8/10 档视+震。

## 禁止

射线当路径；`setSize(innerWidth)`；玩法 UI `position: fixed`；WebGL 静默回退；热路径 `new Audio()`；用 `prepare()` 判断震动；按钮式全盘清；素材再压成低质量 JPEG；棋子 `box-shadow` / CSS 圆角裁切。棋子投影只用 `drop-shadow`（见 BOARD）。道具规则只改 [ITEMS.md](./ITEMS.md) + `items.ts`。反馈只改 [FEEDBACK.md](./FEEDBACK.md) + `FEEL`。
