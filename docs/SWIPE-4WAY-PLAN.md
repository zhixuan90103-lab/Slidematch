# 四向滑动检索计划

**检索已收口；A/D 已落地（2026-08-21）。** 现行规格是四向：[SPEC.md](./SPEC.md) · [OPERATION.md](./OPERATION.md) · [SWIPE.md](./SWIPE.md)。  
八向检索日志：[SWIPE-RESEARCH.md](./SWIPE-RESEARCH.md)。下文保留当时的检索过程。

目标：把业界 **4-connected（只横竖、禁止对角）** 连续划路径的做法核清楚，再决定本仓怎么改。  
范围：iOS 官方、GitHub 实现、学术论文。商店页 / 攻略 / Royal Match 源码不搜。

**三轮已跑完（2026-08-21）。** 建议模型见 §9。等拍板再改规则文档和代码。

---

## 0. 问题框

本仓现在：队尾 → 手指量化成 **八向**（轴 45°、扇区 ±22.5°），`PATH_STICK_DEG = 30°` 专门防止田字格斜划先吃横竖。

要改成：下一步只许 **上 / 下 / 左 / 右** 四邻（von Neumann / 4-connected），对角邻居非法。

| 八向现状 | 四向后 |
|----------|--------|
| 田字斜划 **只连对角、不吃横竖** | 对角邻居非法；斜划应变成 **楼梯折线**（先横后竖或先竖后横） |
| 禁止「进格 / 谁近加谁」（斜向会被横竖抢走） | 进格 / AABB 命中 **重新合法**（对角不再是候选）— 三轮后确认 |
| 粘滞 30° 护对角 | 粘滞要护的是 **当前轴**，45° 是最危险的边界 |
| 插值已走直角折线（两轴都跳） | 开源四向几乎不做插值；本仓插值应保留作漏格补点 |

检索决策（三轮后答案在 §9）：

1. **加格触发**：进格 / 过共享边（A≈D），不要整划轴锁（C），不要只把八向裁成 ±45°（B）
2. **45° 斜划**：楼梯（过边顺序），不要 UIScrollView 整划锁轴
3. **粘滞 / 死区**：轴滞回（沿用当前轴直到另一轴明显更大）；格心死区可留
4. **快划补点**：保留轨迹插值 / 四向 walk；开源用进格，快划会漏
5. **减格**：只退上一格（三仓一致）
6. **闭环**：Two Dots 方形清色 — 未定点，不实现

---

## 1. 三轨权威

冲突时：玩法语义听 Two Dots 帮助原文，几何听数字拓扑 / 画线，指针听 Apple。  
Apple **没有**「棋盘划同色」API；官方四向是 **离散轻扫**，不是连续路径。

```
玩法语义（连什么）     几何（格子怎么走）        指针（iOS 怎么采样）
Two Dots 帮助原文       4-connected / 过边       UITouch / Pointer / Pan
DESIGN.md 拍板          Red Blob / Rosenfeld     已有 OPERATION
```

---

## 2. 权威表（三轮后）

### iOS 官方

| 来源 | 核到 | 对本仓 |
|------|------|--------|
| [UISwipeGestureRecognizer](https://developer.apple.com/documentation/uikit/uiswipegesturerecognizer) | 离散；方向只有 up/down/left/right；慢划要方向准、快划要距离大；**成功才回调一次** | **不能**拿来划路径 |
| [Handling swipe gestures](https://developer.apple.com/documentation/uikit/handling-swipe-gestures) | 「须沿水平或竖直、不得明显偏离主方向」。原文：**Swipes aren’t intended for interactive gestures**；interactive 用 pan | 轴偏离阈值可借语义；**禁止**把 swipe recognizer 接到棋盘 |
| [UIPanGestureRecognizer](https://developer.apple.com/documentation/uikit/uipangesturerecognizer) · [Handling pan](https://developer.apple.com/documentation/uikit/handling-pan-gestures) | 连续；`translation` / `velocity`；无内建四向 | 连续划的官方容器。本仓已用 Pointer，不必换 UIKit |
| [isDirectionalLockEnabled](https://developer.apple.com/documentation/uikit/uiscrollview/isdirectionallockenabled) | 先明显横或竖则锁死另一轴；**若一开始就是对角，全程不锁**，直到这次拖完 | **整划锁轴 = 模型 C**。Two Dots 中途必须拐弯，C 作主模型否决 |
| [HIG · Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures) | swipe = 揭示 / 返回 / 滚动 | 不要把 HIG swipe 抄成玩法 |
| [preciseLocation](https://developer.apple.com/documentation/uikit/uitouch/preciselocation(in:)) | Do not use for hit testing | 四向同样禁止 |

**可进 OPERATION 的 Apple 句：** 连续路径用 pan/pointer，不用 swipe；偏离主方向的「精度 vs 速度」只作手感参考。  
**不能进 OPERATION：** directional lock 的「对角起划则永不锁」——那是滚动，会禁止中途 L 形。

### GitHub / 实现

| 仓 | 邻域 | 触发 | 退格 | 插值 | 备注 |
|----|------|------|------|------|------|
| [`punsal/Wonder-Link-Clone`](https://github.com/punsal/Wonder-Link-Clone) `LinkSystem.cs` + `BasicChip.cs` | 四向 `(|Δr|,|Δc|)∈{(1,0),(0,1)}` | **A**：`Physics2D.Raycast` 指针点，零方向 | 指针落在倒数第二格才退一格 | 无 | 同色链；≥3；未命中则等待、不取消 |
| [`msantam2/color-connect`](https://github.com/msantam2/color-connect) | `DELTAS = ±x ±y` 四向 | **A**：`onMouseOver` + `isNeighbor` | 点色点清整条（不是逐步退） | 无 | Flow Free 族，不是消子 |
| Habby `LinePuzzle` `SquareScript.IsAdjacent` / `DrawScript` | Manhattan 且 **一轴接近 0**（对角被滤掉） | **A**：hover 当前格 + 双向 `IsAdjacent` | 有逐步退 | 无 Bresenham；慢划略缩 collider（0.85–1.0） | 划线过格，不是同色链；模式仍是四向进格 |
| [`poushali-chakraborty/Two-Dots`](https://github.com/poushali-chakraborty/Two-Dots) | — | 自由画布折线 | — | — | **误名**。不是网格四向，不作对照 |
| Two Dots / BF / Disney | — | — | — | — | **无官方源码**（停搜商店） |

三仓可读实现都是 **A（进格 + 四邻）**，没有 B（方向过半步），没有 C（整划锁轴）。

### 学术 / 数字几何

| 来源 | 主张 | 对本仓一句 |
|------|------|------------|
| Rosenfeld 数字拓扑 | 4-邻 vs 8-邻；对角连通有悖论 | 禁止对角是拓扑，不是调参 |
| [Red Blob orthogonal walk](https://www.redblobgames.com/grids/line-drawing/#orthogonal-steps) | 每次过一条水平**或**竖直格边；过角才允许对角步 | 快划补点 = 过边 walk；禁止 8-supercover 直接加格 |
| Accot & Zhai CHI 2002 Crossing（已读 PDF） | 越过边界选中；连续正交 crossing（C/OC）最快；连续共线 crossing（C/CC）最慢、误差最高；可级联划过多目标 | 共享边应 **垂直于行进方向**（四向天然满足）；斜着擦过格心是共线 crossing，更差 |
| Wobbrock EdgeWrite UIST 2003（已读 PDF） | 认的是碰到的边/角顺序，不是整条轨迹；四主轴更稳 | 死区 + 轴滞回的论据；不是棋盘算法 |
| Holz & Baudisch CHI 2010 | 「胖手指」里 67% 是系统偏移，不是指腹面积 | 不要靠格心精确点中；进格/过边比「距心 0.5」更贴触摸 |
| Harabor & Botea 2010 | 4-connected 寻路 | 只借术语，不抄 A* |

---

## 3. 四类做法（三轮后定性）

```
A. 进格 + 四邻     开源默认。指针落在哪格，该格是队尾的四邻则加。
B. 轴向量化+过半步  本仓八向裁四向。45° 扇区边界会抖。
C. 整划轴锁        UIScrollView。中途不能拐 L，否决作主模型。
D. 过共享边        Crossing / Red Blob walk。斜切角 = 连过两条边 = 楼梯。
```

A 是 D 的离散近似：进入邻格 ≈ 已经越过共享边。  
B 单独用会在 ±45° 振荡。  
C 与「可拐弯」冲突。

对照题（建议模型下的答案）：

| 题 | A/D 建议 |
|----|----------|
| 2×2 同色、左下→右上 | 楼梯：先经过的那条边对应的横或竖，再另一条。**不连对角** |
| 快划跳格 | 插值再跑 A/D（开源会漏；本仓已有 `PATH_TRACE_STEP` 直角折线，应对齐四向 walk） |
| 格内心打转 45° | 死区不加减；出死区后沿 **当前轴滞回**，不在 45° 来回切 |
| 退格 | 只退上一格；点链中部不动 |

---

## 4. 检索词（已执行，关闭）

入口仍有效，供以后反查。**不再扩搜** 商店页、同名误仓、交换三消、八向词游戏。

公开 GitHub 搜「two dots clone」噪声极大（自由画布、ECS DOTS、窗口管理器）。有效过滤器：`IsAdjacent` + `rowDiff` + 四向公式。

---

## 5. 三轮循环（已完成）

| 轮 | 焦点 | 状态 |
|----|------|------|
| 1 | Apple 分层 + Wonder-Link 源码 + Two Dots 帮助 | 完成 |
| 2 | 两仓四向 + 过边 vs `PATH_TRACE_STEP` | 完成 |
| 3 | Crossing / fat-finger / C vs D | 完成 |

---

## 第 1 轮 — Apple + Wonder-Link + Two Dots

### 检索

- Apple：Handling swipe / pan、`isDirectionalLockEnabled` 原文、HIG Gestures。
- Wonder-Link **实现**（不止 README）：`LinkSystem.StartDrag/UpdateDrag/EndDrag`、`BasicChip.IsAdjacent`。
- Two Dots 帮助中心原文：https://dots.helpshift.com/hc/en/3-two-dots/faq/368-how-do-i-play-two-dots/

### 核到

1. Apple 把 **swipe** 定义成离散水平/竖直轻扫，并写明不适合 interactive。连续跟踪是 **pan**。
2. `isDirectionalLockEnabled`：先分出一般方向才锁；对角起划则这次拖完都不锁。
3. Wonder-Link 加格条件（按序）：指针下有 ILinkable → 不是队尾 → 若是倒数第二则退格 return → 已在链中则拒绝 → 类型匹配 → `_lastLinkable.IsAdjacent`。  
   `IsAdjacent`：**硬四向**。  
   命中：`ScreenToWorldPoint` + `Physics2D.Raycast(..., Vector2.zero)` = 点采样进格，**不是**方向过半步。
4. Two Dots 官方：「Connect two or more Dots of the same color to create **horizontal or vertical** lines。」方形四连清该色。可拐弯（Wikipedia / Pocket Gamer 旁证，帮助页没写「不可拐」）。

### 反查

- 上次把 Wonder-Link README 当实现：README 说「进格射线」，源码确认是 **零方向 raycast 点命中**，没有沿轨迹的射线、没有 `PATH_ADD_ALONG`。
- 「Apple 四向」容易误抄 swipe recognizer；原文明确 swipe 不是 interactive。
- GitHub 名含 Two-Dots 的 `poushali-chakraborty/Two-Dots` 是自由折线，**不是**网格四向。

### 补漏 / 计划改

- 开源默认是 **A 不是 B**。本仓若只改 `OCTANT` 为 4，是少数派。
- 第 2 轮必须再找进格仓，并对照本仓插值（A 无插值会漏格）。
- 纸面「只改八向为四向、常数不动」：2×2 斜划在 B 下会在 ±45° 来回选横/竖，**既不是对角也不是稳定楼梯**。记为错误默认。

---

## 第 2 轮 — 两仓 + 过边 vs 插值

### 检索

- `msantam2/color-connect`（Flow Free 开源）：`lib/constants.js` `DELTAS`、`color_connect_tile.js` `isNeighbor`、`tile.jsx` `onMouseOver`。
- Habby `LinePuzzle`：`IsAdjacent`（Manhattan + 一轴接近 0）、`DrawScript` hover 加格。
- Red Blob §2.1 Orthogonal steps vs 本仓 `pointsAlongAimed`。

### 核到

1. color-connect：四向 `[[1,0],[0,1],[-1,0],[0,-1]]`。按下着色点，拖到邻居格 `onMouseOver` 且 `isNeighbor` 才铺路。无轨迹插值。
2. LinePuzzle：`|dx|+|dy| ≤ 1.5` **并且** `(|dx|<0.5 || |dy|<0.5)` → 对角两边都 ~1，被拒。Hover 当前格 + 双向邻接才 `ConnectToSquare`。无 Bresenham。collider 随速度在 **0.85–1.0** 间 lerp（慢划略缩、快划保持满尺寸），不是「快划放大很多」。
3. 本仓 `pointsAlongAimed`：两轴都超过 `stepPx` 时走直角折线（有来时方向先沿该向，否则主轴优先）。这已经是 Red Blob **orthogonal walk** 的近亲，当初是为了护八向拐角，四向后它变成 **规则补点**。

### 反查

- Flow Free / LinePuzzle **不是**同色消除，但四向过格与 Two Dots 邻域相同；可借几何，不借结算。
- 「业界用插值补漏格」不成立：看到的实现都靠进格，快划漏了就漏。本仓 iOS 网页 ~60Hz 合批，**比原生 Unity 更需要插值**。
- LinePuzzle collider 变化只有约 15%，不能当成「胖手指放大命中」的完整方案。

### 补漏 / 计划改

- 四向后插值 **保留**，并把折线解释从「护对角」改成「4-connected walk」。
- `PATH_CROSS_R = 0.6`（小于对角到横竖心的 0.707）是八向防误触横竖；四向后这条理由消失，需重估或删。
- 第 3 轮用 Crossing 原文判断 A 是否够、要不要真过边（D）。

---

## 第 3 轮 — Crossing / 胖手指 / C vs D

### 检索

- Accot & Zhai CHI 2002 PDF（Crossing 全文）。
- Wobbrock EdgeWrite UIST 2003 PDF。
- Holz & Baudisch CHI 2010 摘要（SIPLab）：胖手指里 67% 是姿势偏移。
- 回读 `isDirectionalLockEnabled` 对角不锁 vs Two Dots 可拐弯。

### 核到

1. **Crossing：** 越过目标边界即选中。连续正交 crossing 最快；连续共线 crossing 最慢、错最多。论文建议目标边尽量 **垂直于运动方向**。级联 crossing（一划过多个目标）就是路径选取（Lotus Notes 划选邮件）。
2. 映射到棋盘：两格的 **共享边** 垂直于四向步进 → 过那条边加格，符合 C/OC。斜着瞄格心是 C/CC，更差。这支持 **D**，并说明八向「瞄对角格心」在四向里没有好模型。
3. **Fat finger：** 误差多是系统偏移而非指腹圆盘。格宽 60 已大于典型偏移；更该避免「必须贴近格心」的 B，倾向 A/D 的区域/边界判定。按下第一格仍可用现有 0.8 格心半径。
4. **C vs D：** UIKit 轴锁服务滚动（一次一个主轴）。Two Dots / Wonder-Link / LinePuzzle 都允许 **同一划中多次拐直角**。C 作主模型会把 L 形变成「必须抬手再划」。否决。Apple「对角起划不锁」也不能当 45° 策略：那是放弃锁，不是楼梯。

### 反查

- 第 0 轮把 directional lock 写成「最接近四向手感的系统行为」——对 **滚动** 成立，对 **可拐弯路径** 不成立。
- Crossing 实验是笔+平板，不是电容触摸；方向结论可借，时间常数不要抄像素。
- EdgeWrite 认角顺序、允许轨迹发颤：支持「认过了哪条边」而不是「轨迹像不像直线」。

### 补漏 / 计划改

- 建议 **A/D 杂交**：逻辑上过共享边（D），实现上可用进格（A）近似，因 spacing=0 时进邻格 ≈ 已过边。
- 45°：按过边顺序走楼梯，**不要** C。轴滞回只抑制格内心微振，不锁死到抬手。
- 实现前要改的 OPERATION 条款见 §6；**仍不改代码**。
- 关闭：再搜 Two Dots 官方源码、swipe recognizer、整划 directional lock、`preciseLocation`、Amanatides 当 2D 抄本。

---

## 6. 映射回本仓（拍板后才动）

| 文件 | 四向时会动什么 |
|------|----------------|
| [DESIGN.md](./DESIGN.md) | 「八向可拐」→「四向可拐」；田字斜划验收改为楼梯 |
| [OPERATION.md](./OPERATION.md) | 加格改为队尾四邻 + 进格/过边；粘滞改为轴滞回；删「斜向半距更长护对角」；`PATH_CROSS_R` 重估 |
| [SWIPE.md](./SWIPE.md) | 摘要 |
| `src/game/path.ts` | 邻域四向；过边或进格触发；保留 `pointsAlongAimed` 作漏格；`PATH_STICK_DEG` 改为轴滞回或删除对角分支 |
| `src/game/board.ts` | `NEIGHBOR8` 与 `maxComponentSize` 改 4-邻（否则初盘可能四向无解） |
| `src/game/design.ts` | 可选 `RULES.neighborhood: 4` |

纸面错误默认（不要做）：只把 `OCTANT` 砍成 4 个、其余常数不动。

---

## 7. 明确不搜 / 不抄

- 应用商店同名页、财务、攻略连招
- 名含 Two-Dots 但无网格邻接的自由画布仓
- Royal Match / Candy Crush **交换**三消；Puzzle & Dragons 八向挪珠；Boggle / Wordament 八向
- `pointerrawupdate`、`preciseLocation` 进格
- Amanatides–Woo 当 2D 抄本
- `UISwipeGestureRecognizer` 接到 `#game-board`
- 用 `isDirectionalLockEnabled` 锁整划

---

## 8. 清单（均已做）

- [x] Wonder-Link `LinkSystem.cs` / `IsAdjacent`：点命中 collider，不是中心距
- [x] Apple directional lock 对角不锁原文
- [x] Accot & Zhai 2002 Crossing → 共享边
- [x] 两仓：color-connect、LinePuzzle（另：公开「Two-Dots」误仓已排除）
- [x] 纸面：只改邻域不改触发 = 45° 振荡，错误默认

---

## 9. 建议模型（等拍板）

**A/D 杂交，不要 B 单独、不要 C。**

1. **邻域：** 只四邻。对角非法。初盘连通改 4-connected。
2. **加格：** 队尾指向的那条共享边被手指越过，或指针进入该四邻格（spacing=0 两者几乎同一件事）。同色、不在链上、不是跳格。
3. **45°：** 过边顺序走楼梯。不整划锁轴。
4. **滞回：** 沿用当前轴，直到另一轴分量明显更大（替换「相对来时方向 ±30° 护对角」）。格心死区可留。
5. **快划：** 保留采样间插值；两轴都跳时走直角折线（已有 `pointsAlongAimed`）。合批点仍展开。
6. **减格：** 只退上一格，须在旁。不要点链中部收回。
7. **第一格：** 仍浅格 rect + 0.8 格心 + `stable`。
8. **闭环清色：** 不实现。

拍板后先改 DESIGN / OPERATION，再改 `path.ts` / `board.ts`。手感常数仍先停，直到规则文案过目。
