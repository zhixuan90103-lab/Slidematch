# 滑动检索

玩法以 [SWIPE.md](./SWIPE.md) 为准。本文是检索日志与计划，不改规则。

三轮循环：2026-08-20。每轮 = 检索 → 反查 → 补漏 → 改计划。

---

## 第 1 轮

**检索：** UITouch / Capacitor WKWebView / 侧滑返回。

**核到：**

- Apple 原文：`preciseLocation` — *Do not use the returned point for hit testing.*  
  https://developer.apple.com/documentation/uikit/uitouch/preciselocation(in:)
- WKWebView 水平滑回上一页：`allowsBackForwardNavigationGestures`。网页 `touch-action` **关不掉** 这套原生手势（[w3c/pointerevents#358](https://github.com/w3c/pointerevents/issues/358)）。要用原生关掉该开关。Capacitor 默认可查工程；未改过则可能仍开着。
- 合批 API 仍是 iOS **18.2+**（Can I Use + WebKit 18.2 博文）。

**反查：** 上次「边缘手势能续划」写得太松。侧滑返回是 **原生 WKWebView**，不是 Pointer cancel 通道能完全接住的。

**补漏：** 本仓 `capacitor.config.ts` **没有**设 `iosScheme`。Capacitor 默认 iOS scheme 是 `capacitor`（`capacitor://localhost`）。合批 API 要求 **secure context**；自定义 scheme 是否算安全，文档含糊，**必须真机探测**，不能假定有。

**计划改：** 真机探测加两项：scheme（`location.protocol`）+ `allowsBackForwardNavigationGestures` 是否在抢棋盘左缘。

---

## 第 2 轮

**检索：** 2D supercover、Bresenham、合批 secure context。

**核到：**

- [Red Blob Games · line drawing](https://www.redblobgames.com/grids/line-drawing/)：supercover = 线段碰到的每一格；**擦过格角会走出对角步**。这正是田字格会列出另外两角的几何原因。
- Bresenham 是画线用的「细线」，会漏掉只擦到的格。快划补点若用 Bresenham，漏格补不全。
- Amanatides–Woo 仍是 3D 亲戚；2D 实现应对 Red Blob / supercover，不要把 3D 论文当直接可抄代码。
- `getCoalescedEvents` 规范限制在 **secure context**（MDN、Blink 曾从非安全上下文移除）。

**反查：** 上次「supercover 每格当采样再 stepPath」方向对，但没写清：**supercover 在对角过角时会包含横竖格**。补点必须是「沿轨迹插值手指位置」或「只把 supercover 当候选再套方向规则」，不能按 supercover 顺序无脑加。

**补漏：** 更好的补点方式可能是 **在上一点与这一点之间按弧长插几个点**（例如每 0.4 格一个），对每个点跑现有 `stepPath`。不一定要 supercover 格子列表。插值更贴「系统丢掉了中间 move」，和方向认格同构。

**计划改：** 补点设计稿优先「轨迹插值」，supercover 降为备选，并写明过角陷阱。

---

## 第 3 轮

**检索：** Capacitor 8 scheme、WebKit 输入帧率、`pointerrawupdate`。

**核到：**

- Capacitor `server.iosScheme` 默认 `capacitor`，不能设成系统已占用的 `http`/`https` 除非走文档允许的配置。要 `https://localhost` 才明显是 secure context，需显式配置并 `cap sync`（会动原生加载方式，单独立项，不塞进滑动小补丁）。
- WebKit 历史上 **iOS 网页触摸按 ~60Hz 合批**（Bugzilla 145814 一类讨论）。ProMotion 120Hz 上原生 UIKit 更密，WKWebView 仍可能合批到 60。这加强「不要假设每格都有 move」。
- `pointerrawupdate`：MDN 写明伤性能；Safari 18.2 宣传的是 coalesced/predicted，不是 rawupdate。仍不采用。

**反查：** 「合批点作为主补丁」对 **iOS 18.1 及更早、以及 capacitor:// 若不算 secure** 会整段失效。轨迹插值不依赖系统版本，应是主路径。

**补漏：** Wonder-Link 示例 `IsAdjacent` 默认注释是 **四向**，八向是可选。他们用进格 + 四向，田字格不存在。我们八向必须方向认格。GitHub 仍无 BF/Two Dots 源码。

---

## 三轮后的结论（保持）

| 项 | 结论 |
|----|------|
| 加格几何 | 保持方向认格 + 粘滞 + 先加后减。 |
| 进格射线 / 谁近加谁 / 四向 | 不做。 |
| `preciseLocation` 进格 | 不做（Apple 原文禁止）。 |
| 预测点当真路径 | 不做。 |
| `pointerrawupdate` | 不做。 |
| 快划漏格 | **主：采样间轨迹插值再 `stepPath`。** 辅：18.2+ 且 secure 时合批点也插进去。 |
| supercover 列表直接加格 | **禁止**（田字格过角）。 |
| 侧滑返回 | 网页管不了；必要时改 WKWebView 开关，单独立项。 |
| 改 `iosScheme` 换 https | 为合批服务则单独立项，不和滑动补丁绑死。 |

---

## 检索计划（三轮后）

已完成：

- [x] UITouch location vs preciseLocation（含 Apple 禁止 hit-test 原文）
- [x] 合批 / 预测：iOS 18.2+、secure context
- [x] Wonder-Link：退上一格；进格射线；默认可四向
- [x] Bresenham ≠ supercover；过角会带上田字另外两角
- [x] 轨迹插值 vs supercover：插值更贴「丢掉的 move」
- [x] WKWebView 侧滑返回 ≠ `touch-action`
- [x] 本仓未设 iosScheme，默认 capacitor://
- [x] 无 BF / Two Dots 滑动源码
- [x] pointerrawupdate 不采用

下一轮（实现向，仍不先改手感常数）：

1. **真机探测（SlideMatch B）**  
   - `location.protocol`  
   - `pointermove` 上 `getCoalescedEvents` 有无、返回长度  
   - iOS 版本  
   - 左缘快滑是否触发返回/闪白  
2. **`path.ts` 纯函数用例**  
   田字格斜划只对角；飞回起点不退光；三点直线连上。  
3. **补点** — 已按轨迹插值落地（`PATH_TRACE_STEP` + 可选合批）。真机仍要探测合批是否真有点。  
4. 侧滑返回：仅当 1 复现再改原生 `allowsBackForwardNavigationGestures`。  
5. `iosScheme: https`：仅当 1 证明合批因 scheme 不可用、且插值仍不够时再议。  
6. 对角 X：玩法未定，检索关闭。

不计划再搜：商店页、攻略、Royal Match、Amanatides 当 2D 抄本、pointerrawupdate。

---

## 链接

- https://developer.apple.com/documentation/uikit/uitouch/preciselocation(in:)  
- https://developer.apple.com/documentation/webkit/wkwebview/allowsbackforwardnavigationgestures  
- https://github.com/w3c/pointerevents/issues/358  
- https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents  
- https://caniuse.com/mdn-api_pointerevent_getcoalescedevents  
- https://webkit.org/blog/16301/webkit-features-in-safari-18-2/  
- https://www.redblobgames.com/grids/line-drawing/  
- https://github.com/punsal/Wonder-Link-Clone/blob/master/Assets/Scripts/Core/Link/README.md  
- https://capacitorjs.com/docs/config  
