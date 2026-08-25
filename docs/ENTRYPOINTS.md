# 入口与调用链

## 命令

| 命令 | 结果 |
|------|------|
| `npm run dev` | http://127.0.0.1:5190/（`strictPort`，被占则失败） |
| `npm run build` | `tsc` + `dist/`（相对路径） |
| `npm run cap:sync` | build + cap sync ios |
| `npm run ios:bootstrap` | add ios + 注入插件 + sync |
| `npm run ios` | sync + open Xcode |

## Web 启动链

```
index.html
  → style.css
  → main.ts
       → lockWebGestures / safeArea
       → createRenderer(#stage)     透明，不挡舞台底色
       → mountDevicePreview → stage transform
       → mountBoard(#ui-root)       视觉框 + 6×6 黏土棋子
```

## DOM

```
#shell
  #viewport
    #app
      #stage
        canvas
        #ui-root
          #hud
          #game-board
            .board-pad
            .board-cells
            .board-mask
              .board-movers
          #settings-root
#device-switcher / #device-label   (web only)
```

## iOS

震动插件不会随 `cap:sync` 自动注册。第一次 / 改插件必须 `ios:bootstrap`。见 [HAPTICS.md §0](./HAPTICS.md)。

## 改哪里

| 要改 | 文件 |
|------|------|
| 视觉/规则默认 | `src/game/design.ts`（`LOOK` / `PIECE_DRAW` / `RULES` / `FEEL`） |
| 选中/消除/变色/合成反馈 | [FEEDBACK.md](./FEEDBACK.md) · `design.ts` `FEEL` · `clearFx.ts` |
| 调参覆盖 | `src/game/settings.ts`；HUD 齿轮 → `#settings-root` |
| 素材 | `src/assets/` · [BOARD.md](./BOARD.md) |
| 道具生成/结算 | `src/game/items.ts` · [ITEMS.md](./ITEMS.md) |
| 分数 | `src/game/score.ts` · [DESIGN.md](./DESIGN.md) |
| 初盘 / 点中 | `src/game/board.ts` |
| 盘 DOM | `src/game/mount.ts` · `style.css` |
| 玩法规则 | [DESIGN.md](./DESIGN.md) |
| 手感常数 | [OPERATION.md](./OPERATION.md) · `src/game/path.ts` |
| base / 端口 | `vite.config.ts` |
| appId | `capacitor.config.ts` |
| 震动原生 | `plugins/native-haptics/` + bootstrap |
