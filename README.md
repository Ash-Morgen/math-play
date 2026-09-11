# 数学岛 · 儿童数学练习

给孩子自用的数学练习工具。**零成本、无广告、不抄题库**——所有题目由算法现场生成。
纯静态 PWA，手机 / 平板 / 电脑通用，可加到桌面全屏使用。

> **教材版本：沪教版（五四学制）二年级上册**
> 注意不是网上常见的「沪教版六三制」，两者目录完全不同。权威清单来自 `C:\Users\Administrator\WorkBuddy\Claw\sh-kg`。

---

## 一、两个独立站点

| 站点 | 入口 | 内容 |
|---|---|---|
| **数感训练** | `index.html` | 10 / 20 / 100 以内加减，CPA 三阶段递进（具象 → 图形 → 抽象） |
| **二年级上 · 同步闯关** | `grade2.html` | 6 大单元 · 20 个玩法 · 家长锁控制进度 |

两站**完全独立**：不共享样式表、互不跳转，可以分别收藏到手机桌面。

线上地址：

- 数感训练 → https://ash-morgen.github.io/math-play/
- 二年级 → https://ash-morgen.github.io/math-play/grade2.html
- 触摸自检页（排查手机问题用）→ https://ash-morgen.github.io/math-play/touch-test.html

---

## 二、二年级：20 个玩法

| 单元 | 玩法 | 形式 |
|---|---|---|
| **1 100 以内数的加减法（二）** | 竖式填数（动手版）· 进位还是不进位 · 估算（拖答案）· 💎宝石矿工 · ⚖加减天平 | 全动手 |
| **2 欢乐购物街** | 认币分类 · 人民币换算连线 · 拖钱币付钱 | 全动手 |
| **3 表内乘法** | 分苹果 · 算式的读写与名称 · 💥乘法消除（三关）· ⚖乘法天平 · 乘加乘减 | 4 动手 + 1 选择 |
| **4 我的学校我的家** | 方向迷宫 · 放在正确方位 · 排到正确位置 | 全动手 |
| **5 分类** | 点一点，数一数 · 拖拽分类 | 全动手 |
| **6 数学广场** | 搭配连线 · 排一排（推理） | 全动手 |

**20 个玩法中 19 个是动手操作**（拖拽 / 消除 / 点选），只剩 1 个选择题（算式名称）。

### 家长锁（按学校进度解锁）

- 单元 **2~5 默认锁定**（灰色 🔒），单元 1 和 6 开放
- 点锁定单元 → 输入密码 **2468** → **永久解锁**（存 localStorage，刷新/重开仍在）
- 家长报告页底部有「🔒 重新锁上 2~5 单元」，学期结束或想重控进度时一键回收
- 解锁状态**按设备记录**：手机解锁了，平板打开仍是锁的

---

## 三、文件结构

```
math-play/
├── index.html          数感训练（独立站点）
├── app.js  styles.css  数感训练的逻辑与样式
├── grade2.html         二年级闯关（独立站点）
├── grade2.js           ★ 玩法定义（MODES 数组）+ 主流程 + 分页 + 家长锁
├── grade2.css          ★ 二年级全部样式（已内联基础样式，不依赖 styles.css）
├── drag.js             ★ 拖拽引擎（含 vfill / count / link / order / pay 等）
├── drag-extra.js       ★ 扩展引擎（maze / place / seat / group / eqfill / fill / carry）
├── balance.js          ★ 数字天平引擎
├── mine.js             ★ 宝石矿工引擎（限时多关）
├── match.js            ★ 乘法消除引擎（三关递进）
├── sw.js               Service Worker（network-first，缓存名 mathplay-v3）
├── manifest.json       PWA 清单
├── icon.svg            图标
├── test_modes.js       ★ 自测：各类题目生成器校验
├── test_match.js       ★ 自测：消除玩法专项（值集自洽 / 有解 / 零死局）
├── touch-test.html     触摸自检页（手机上点不动时用它定位）
├── demo-mine.html      宝石矿工早期原型（保留作参考，未接入正式页面）
└── docs/
    ├── 开发手册.md      ★ 架构、引擎 API、如何加新玩法
    ├── 踩坑记录.md      ★ 所有踩过的坑与解决方案
    └── 开发日志.md      ★ 演进时间线（为什么做成现在这样）
```

★ = 改代码时最常碰的文件。

### 脚本加载顺序（grade2.html）

```html
<script src="drag.js"></script>        <!-- 必须先：暴露 DragEngine 与 _utils -->
<script src="drag-extra.js"></script>  <!-- 挂在 DragEngine.mount 上 -->
<script src="balance.js"></script>     <!-- 同上，认领 type:'balance' -->
<script src="match.js"></script>
<script src="mine.js"></script>
<script src="grade2.js"></script>      <!-- 最后：定义 MODES 并启动 -->
```

**顺序不能乱**：后加载的引擎通过包装 `DragEngine.mount` 认领自己的题型。

---

## 四、开发

### 本地运行

```bash
cd ~/Documents/math-play
python -m http.server 8899 --bind 0.0.0.0
# 电脑：http://localhost:8899/grade2.html
# 手机（同一 Wi-Fi）：http://<本机局域网IP>:8899/grade2.html
```

> 用局域网 IP，不要用 `198.18.0.1`（那是 Clash 虚拟网卡，手机连不上）。

### 自测（改完题目生成逻辑必跑）

```bash
node test_modes.js     # 所有模式：题目必含正确答案、选项无重复、竖式/天平必须成立
node test_match.js     # 消除玩法：值集自洽、棋盘必有解、模拟整局零死局
```

两个脚本都是**从源码里抽纯逻辑段**再跑，所以改了函数名或 `const`/`var` 导致抽取锚点失效时，要同步改脚本里的锚点（见「踩坑记录」）。

### 部署

推送到 GitHub，由 GitHub Pages 自动发布：

```bash
git add -A && git commit -m "..." && git push origin main
```

国内网络下 `git push` 的 TLS 时常中断，备选方案是走 GitHub Contents API 直传（见「开发手册 · 部署」）。**推送后要等 CDN 刷新**（各文件时间不一，一般 1~5 分钟），核验方式：

```bash
curl -s https://ash-morgen.github.io/math-play/grade2.js | grep -c "关键字"
```

---

## 五、设计原则（踩坑总结出来的）

1. **题目必须有解**。付钱的钱币要能凑出价格、消除的值集要能自洽、分苹果要能整除、天平两边要真的相等。无解的题会让孩子卡死，比没有题更糟。
2. **答案不能恒定**。曾经有一题问「要向十位进几」，而数学上进位永远进 1，答案永远是 1——孩子点一次就永远对，毫无强化作用。
3. **动手优于点选**。「拖」「凑」「摆」比「四选一」更能练到思维，也更不容易腻。
4. **玩法要定期清理同质化**。同一引擎只是参数不同的，合并成关卡递进；形式与功能都重复的，直接删。
5. **反馈要即时且分层**。消除类玩法做完整奖励链：碎裂 → 宝石飞出 → 计分板弹跳 → 飘字 → 连击光晕。快节奏玩法里，反馈慢半秒爽感就没了。
6. **移动端要单独验**。桌面全绿不等于手机能用：手指有 5~15px 抖动、WebView 可能不发 Pointer Events、窄屏下卡片会小到点不中。见「踩坑记录 · 移动端三章」。

---

## 六、文档索引

| 文档 | 内容 |
|---|---|
| [docs/开发手册.md](docs/开发手册.md) | 架构、各引擎 API、加新玩法的完整步骤、部署细节 |
| [docs/踩坑记录.md](docs/踩坑记录.md) | 27 个坑：拖拽、移动端、题目生成、动画、部署、工具链 |
| [docs/开发日志.md](docs/开发日志.md) | 从数感训练到 20 个玩法的完整演进过程与每次决策的原因 |
