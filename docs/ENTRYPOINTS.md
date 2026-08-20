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
       → createRenderer(#stage)     透明，不挡背景图
       → mountDevicePreview → stage transform
       → mountBoard(#ui-root)       视觉框 + 9×9 点心
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
#device-switcher / #device-label   (web only)
```

## iOS

震动插件不会随 `cap:sync` 自动注册。第一次 / 改插件必须 `ios:bootstrap`。见 [HAPTICS.md §0](./HAPTICS.md)。

## 改哪里

| 要改 | 文件 |
|------|------|
| 视觉默认 / 调参 | `src/game/settings.ts`（面板 CSS 隐藏） |
| 素材 | `src/assets/` · [BOARD.md](./BOARD.md) |
| 初盘 / 点中 | `src/game/board.ts` |
| 盘 DOM | `src/game/mount.ts` · `style.css` |
| 玩法规则 | [DESIGN.md](./DESIGN.md) |
| base / 端口 | `vite.config.ts` |
| appId | `capacitor.config.ts` |
| 震动原生 | `plugins/native-haptics/` + bootstrap |
