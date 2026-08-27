# 音效方案

配套：[AGENTS.md](../AGENTS.md) · [ENGINEERING.md](./ENGINEERING.md)

> **采用音效3 拇指琴。** 玩法 API：`gameSfx`（`src/audio/noteSfx.ts`）。  
> 下文是产品需求 + 已修 BUG，再往后是原生池长期规范。

## 产品需求（现行）

| 事件 | `gameSfx` | 怎么响 | 不响 |
|------|-----------|--------|------|
| 按下普通子 | `press(0)` | 音阶第 1 音 | 未点中 stable |
| 过格 / 回退 | `tick(n)` | 低两度的大调 1–14，之后约 100 音分 | 长度没变 |
| 散消点子 | `mark(n)` | 同音阶 | — |
| 点中/划入魔法（全盘翻） | `magicEnter()` | 四音、偏低、小声，只一次 | — |
| 魔法继续过格 | `coin()` | 短五度 | 55ms cooldown |
| 消除开始缩子 | `clear()` | C–E–G，间隔约 70ms | 取消 / &lt;2 |
| 取消 / 第二指 | — | — | 不响、不震 |

包：`'1'` 钢片琴 · `'2'` 木琴 C5 · `'3'` **采用** 拇指琴。`setSfxPack`。

## 已修 BUG

| 现象 | 原因 | 设计 |
|------|------|------|
| 点子有时不立刻出声、像卡住 | `AudioContext` 在 preload 时创建，一直 `suspended`；第一次播放和 `resume()` 不同栈，或 resume 未完成就 `start()` | `pointerdown` **先** `unlock()`（`input.ts`），同手势里 `resume()`；未 running 则排队，resume 后再播，不丢音 |
| 第一次划静音 | 样本还在 fetch/decode，`ensureTone` 失败就 return | 进局 `preload()`；未就绪则 load 完再播该次事件 |
| 指数包络从 0 开始 | `exponentialRamp` 非法，部分浏览器卡图 | 从 `0.0001` 起 |

## 音效包（同一套规则）

| 事件 | 怎么响 |
|------|--------|
| 普通过格 | 大调 1–14 格（两段八度），15–36 只再抬约 100 音分 |
| 点中/划入魔法（全盘翻） | 拇指琴四音，约 180ms，只响一次 |
| 魔法过格 | 同一音色短五度 |
| 消除 | 与点魔法同音区四连（C–E–G–A），略响、间隔约 70ms |
| 取消 / &lt;2 | 不响 |

| 包 | 音色 | 样本 |
|----|------|------|
| **音效1** `'1'` | 钢片琴 | `public/sfx/notes/celesta.wav`（CC0 acollier123） |
| **音效2** `'2'` | 木琴 C5（最早那版琴音） | `public/sfx/notes/xylo_c5.wav`（CC0 sgossner / VSCO 2） |
| **音效3** `'3'` **采用** | 拇指琴 | `public/sfx/notes/kalimba.wav`（CC0 dvdfu） |

## 1. 结论

卡顿通常不是 wav 太大，而是热路径上做了这些事：

- 每次触发都 `new Audio()` / 读盘 / `decodeAudioData`
- 每次触发都走一次 Capacitor JS → Native 桥
- iOS 上用 WebAudio / HTMLAudio 和 WKWebView 抢 `AVAudioSession`
- 同一帧里同一 id 连打很多次，没有 cooldown / 每帧上限

正确做法：**预解码进内存 + 每帧最多跨一次桥 + 原生 PlayerNode 池播放**。  
iOS 生产路径 **禁止** WebAudio。

## 2. 不要这样写

- 每个事件单独一次 bridge
- 每次 `AVAudioPlayer` 重定位 / 重新 load
- 玩法里直接 `new Audio(url).play()`

业务层只调用 `audio.playSfx(id)`，不碰播放器。具名 API（如 `gameSfx.press()`）只是薄壳。

## 3. 分层

| 层 | 建议路径 | 职责 |
|----|----------|------|
| 业务 API | `src/utils/gameSfx.ts` | 具名方法，不碰播放器（可选） |
| 单例门面 | `src/audio/AudioManager.ts` | 选后端、设置、生命周期 |
| 目录 | `src/audio/AudioCatalog.ts` | id / 路径 / volume / cooldown / priority / maxVoices |
| 批处理 | `src/audio/AudioBatcher.ts` | rAF 攒帧、去重、封顶 |
| iOS 后端 | `src/audio/IosBackend.ts` | 只发意图，不播样本 |
| Web 后端 | `src/audio/WebBackend.ts` | 桌面 / Android；**iOS 生产禁用** |
| 原生真源 | `plugins/native-audio/` | AVAudioEngine + PCM 缓存 + 节点池 |
| 资源 | `public/sfx/` · `public/bgm/` | 只有运行时会打进包的文件 |

```
src/audio/            # Catalog / Batcher / Manager / backends
src/utils/gameSfx.ts  # 可选薄 API
plugins/native-audio/ # Swift 真源（与 native-haptics 同级）
public/sfx/  public/bgm/
```

改 Swift 后走 `ios:bootstrap`，不要手改 pbxproj。

## 4. 运行时流水线

```
玩法 audio.playSfx(id, { volume?, rate? })
        │
        │  关音 / 未知 id → 直接 return
        ▼
   AudioBatcher.enqueue
        ├ 同 id 本帧已排队 → 丢掉（先到先赢）
        ├ 距上次 flush 不足 cooldownMs → 丢掉
        └ 否则入 Map，schedule rAF（每帧只 schedule 一次）
        ▼
   flush（最多 1 次 / 帧）
        ├ 按 priority 升序（数字越小越重要）
        ├ 截断到 maxPerFrame（正常 5，忙窗口 3）
        └ 给 survivor 盖 lastPlayed 戳
        ▼
   backend.flushSfx(events)     // fire-and-forget，不 await
        │
        ├ iOS: NativeAudio.flushSfx → 取空闲 PlayerNode → scheduleBuffer
        └ Web: AudioBuffer 已缓存 → createBufferSource().start()
```

**热路径零 IO、零 decode、零 `await` 桥。**

Loading 调用一次 `audio.preload()`：

- iOS：`preloadCatalog` 把每个 wav 解成 `AVAudioPCMBuffer`，统一转成 mixer 格式；BGM `prepareToPlay`
- Web：`fetch` + `decodeAudioData` 进 `Map<SfxId, AudioBuffer>`

之后只 `play()` / `scheduleBuffer()`。

## 5. Catalog 契约

每个 SFX 只有一份元数据，JS 与 Swift 共用同一套字段：

| 字段 | 含义 |
|------|------|
| `id` | 类型安全的 `SfxId` |
| `path` | 相对 public，如 `/sfx/press.wav` |
| `volume` | 用户增益之前的底混 0..1 |
| `cooldownMs` | 该 id 两次成功 flush 的最小间隔 |
| `priority` | 越小越重要；超每帧上限时砍尾巴 |
| `maxVoices` | 同一 id 同时在播的上限；超额丢掉，不排队 |

优先级带：

| 带 | 用途 |
|----|------|
| 0–9 | 通关 / 失败 / 关键 UX，禁止被丢掉 |
| 10–19 | 玩家主动操作（按下、误点、按钮） |
| 20–29 | 道具 / 阶段反馈 |
| 30–39 | 背景节奏（碰撞、循环 tick） |

建议数值：

- 目录硬顶 `MAX_SFX_PER_FRAME = 8`
- 实际 `NORMAL_MAX_SFX_PER_FRAME = 5`
- 忙窗口 `BUSY_MAX_SFX_PER_FRAME = 3`（约 260ms）
- 原生节点池 `NATIVE_SFX_POOL_SIZE = 12`
- 最高频循环音：较长 cooldown、低 priority、`maxVoices: 1`

BGM 与 SFX **分路**：

- iOS：`AVAudioPlayer` + **m4a/AAC**（硬件解码，不和 Engine 抢编解码）
- Web：`HTMLAudioElement` loop，不经过 SFX 的 Gain 图
- 独立开关 + 独立音量

## 6. 为什么 iOS 必须走原生

| WebAudio / HTMLAudio 在 WKWebView | 后果 |
|-----------------------------------|------|
| `AudioContext.resume()` 会把 session 拧成 `.playback` | 和静音键 / 混音策略冲突 |
| 每发一次可能跨进程 | 连发时吃掉 16.67ms |
| 热路径 decode 或新建节点 | 掉帧、首声延迟 |

`Capacitor.getPlatform() === 'ios'` **只**实例化 `IosBackend`。  
Web 后端只给 `npm run dev` 和 Android，故意不追求真机丝滑。

原生要点：

1. Session：`.ambient` + `.mixWithOthers` + `.duckOthers`  
   尊重静音键；锁屏暂停；可与其它 App 混音并略 duck。
2. 启动时建好固定 `AVAudioPlayerNode` 池，播放不 alloc。
3. 预加载时全部 buffer 转成统一 mixer 格式，避免 `scheduleBuffer` 格式不匹配抛异常。
4. `flushSfx` 再查一遍 cooldown / maxVoices（防 JS 时钟漂移）。
5. `UIApplication` resign/active：停 SFX、停 Engine；回前台再启 BGM。
6. 监听 route change：若 WebContent 偷偷改 session，掰回 `.ambient`。

JS 的 `flushSfx` **不要 await**。设置音量是人操作频率，可以另走桥，不进每帧。

## 7. Web 后端（仅预览）

- `AudioContext` + `masterGain` + `sfxGain`
- SFX：预 decode 的 `AudioBuffer` → `BufferSource` + 每声一次 Gain
- BGM：单独 `HTMLAudio`，`playsInline`、`loop`
- 首次手势 `unlock()` / `resume()`（浏览器策略）
- **不要**在 iOS App 里走这条路

## 8. 资源与打包

- 运行时文件只放 `public/sfx/`、`public/bgm/`
- 调研、裁剪、候选放到 `docs/audio/sources/`，避免打进包
- `vite` 必须 `base: './'`，音频 URL 用相对路径
- Capacitor WebView 不要把 `/sfx/...` 当成站点绝对路径

## 9. 接入清单

不要先在 `main.ts` 里 `new Audio()`：

1. `src/audio/AudioCatalog.ts` — 先列真实会响的 id
2. `src/audio/AudioBatcher.ts` — 纯逻辑：攒帧、去重、封顶
3. `src/audio/AudioManager.ts` + WebBackend — 桌面先能响
4. `plugins/native-audio/` + `IosBackend` — 真机再切原生
5. Loading：`await audio.preload()`；玩法只 `audio.playSfx`
6. 忙帧调用 `markBusyWindow` 降低每帧条数
7. 触控仍走 `clientToDesign`；音效与震动可并列（`haptics.x()` 旁一行 `audio.playSfx`）

刻意不要：

- 热路径 `fetch` / decode
- 每个 SFX 一次 `registerPlugin` 调用
- iOS 静默回退 WebAudio
- 无上限连发同一循环音

## 10. 验收

桌面 `npm run dev`：

- 连点只听到 cooldown 内的一次
- 同帧多种音只响高优先级的几条
- Network 面板进关后不应再拉 sfx 文件

iOS 真机：

- 打开音效，密集帧仍 60
- 静音键有效
- 切后台无漏播；回前台 BGM 按设置恢复
- 连发不爆音墙（maxVoices + 每帧上限）
