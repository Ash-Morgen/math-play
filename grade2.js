/* 二年级上 · 同步闯关（沪教版 · 五四学制）
   知识点清单来源：WorkBuddy/Claw/sh-kg 沪教版知识图谱（math_2a_shj，7 章 22 知识点）
   题目全部算法生成，仅借鉴知识点与题型设计，不抄录教材原文。 */
(function () {
  'use strict'

  const VER = 'r8';

  /* ---------- 设备自检（排查手机端问题用） ---------- */
  const DEBUG = /[?&]debug=1/.test(location.search);
  const ENV_INFO = {
    pe: (typeof window.PointerEvent === 'function'),
    touch: ('ontouchstart' in window),
    maxTouch: (navigator.maxTouchPoints || 0),
    dpr: window.devicePixelRatio || 1,
    ua: navigator.userAgent
  };
  function envText() {
    return 'Pointer Events: ' + (ENV_INFO.pe ? '支持' : '不支持') +
      '　|　Touch: ' + (ENV_INFO.touch ? '支持' : '不支持') +
      '　|　触点: ' + ENV_INFO.maxTouch +
      '　|　视口: ' + window.innerWidth + '×' + window.innerHeight;
  }
  function initDebugLog() {
    if (!DEBUG || window.__dlog) return;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:36%;overflow:auto;' +
      'background:rgba(0,0,0,.82);color:#7cf;font:11px/1.5 monospace;padding:6px;z-index:99999;' +
      'white-space:pre-wrap;-webkit-user-select:text';
    document.body.appendChild(box);
    window.__dlog = function (msg) {
      box.textContent = new Date().toLocaleTimeString() + '  ' + msg + '\n' + box.textContent;
    };
    window.__dlog('版本 ' + VER + ' | ' + envText());
    ['pointerdown', 'touchstart', 'pointerup', 'touchend', 'click'].forEach(function (t) {
      document.addEventListener(t, function (e) {
        const el = e.target;
        let c = '';
        if (el && el.className && typeof el.className === 'string') c = '.' + el.className.split(' ')[0];
        const tp = (e.touches && e.touches.length) ? ' touches=' + e.touches.length : '';
        window.__dlog(t + ' → ' + (el ? el.tagName : '?') + c + tp);
      }, true);
    });
  }
  const $ = (s) => document.querySelector(s);

  /* ================= 工具 ================= */
  const rnd = (n) => Math.floor(Math.random() * n);
  const ri = (a, b) => a + rnd(b - a + 1);
  const pick = (a) => a[rnd(a.length)];
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const todayKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };
  const EMOJI = ['🍎', '🍊', '⭐', '🎈', '🐟', '🌸', '🍪', '🚗', '🍌', '🐰'];

  /* ================= 音效 ================= */
  let actx = null;
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(f, delay, dur, type, gain) {
    const ctx = audio();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain || 0.10, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.15));
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + (dur || 0.15) + 0.05);
  }
  const sfxOk = () => [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.065, 0.16, 'sine', 0.10));
  const sfxBad = () => { tone(196, 0, 0.18, 'triangle', 0.09); tone(147, 0.13, 0.24, 'triangle', 0.09); };
  const sfxCombo = () => [784, 988, 1175].forEach((f, i) => tone(f, i * 0.05, 0.12, 'square', 0.05));
  const sfxWin = () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.26, 'sine', 0.11));

  /* ================= 选项生成 ================= */
  function numOptions(ans) {
    const set = new Set([String(ans)]);
    const pool = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + 5, ans - 5]);
    for (const v of pool) { if (set.size >= 4) break; if (v >= 0 && v !== ans) set.add(String(v)); }
    let g = 0;
    while (set.size < 4 && g++ < 60) set.add(String(ri(0, Math.max(9, ans + 6))));
    return shuffle(Array.from(set));
  }
  function strOptions(correct, wrongs) {
    const set = new Set([correct]);
    for (const w of wrongs) { if (set.size >= 4) break; if (w && w !== correct) set.add(w); }
    return shuffle(Array.from(set));
  }
  // 十个整十数选项（估算用）
  function tensOptions(ans) {
    const set = new Set([String(ans)]);
    const pool = shuffle([ans + 10, ans - 10, ans + 20, ans - 20]);
    for (const v of pool) { if (set.size >= 4) break; if (v >= 0 && v !== ans) set.add(String(v)); }
    let g = 0;
    while (set.size < 4 && g++ < 40) set.add(String(ri(1, 9) * 10));
    return shuffle(Array.from(set));
  }

  /* ================= 图形渲染辅助 ================= */
  // 竖式（右对齐等宽）
  function vertical(a, b, op) {
    return '<div class="vcalc">' +
      '<div class="vrow">' + a + '</div>' +
      '<div class="vrow"><span class="vop">' + op + '</span>' + b + '</div>' +
      '<div class="vline"></div></div>';
  }
  // 分组实物：几个几
  function groupsHTML(n, per, emoji) {
    let h = '';
    for (let i = 0; i < n; i++) h += '<div class="grp">' + emoji.repeat(per) + '</div>';
    return '<div class="groups">' + h + '</div>';
  }
  // 方位十字
  function compassHTML(highlight) {
    const c = (d) => '<div class="cdir' + (highlight === d ? ' on' : '') + '">' + d + '</div>';
    return '<div class="compass">' +
      '<div></div>' + c('北') + '<div></div>' +
      c('西') + '<div class="cctr">🧭</div>' + c('东') +
      '<div></div>' + c('南') + '<div></div></div>';
  }
  // 人民币
  function moneyHTML(text) {
    return '<div class="money">' + text + '</div>';
  }

  /* ================= 游戏模式 ================= */
  const MODES = [

    /* ========== 1. 100以内数的加减法（二） ========== */
    {
      id: 'v-add', unit: '1 100以内数的加减法（二）', icon: '🖐️', name: '竖式填数（动手版）',
      desc: '拖数字填进方框里', kind: 'drag', round: 6,
      gen() {
        const add = rnd(2) === 0;
        let a, b, c;
        if (add) { a = ri(12, 58); b = ri(11, 99 - a); c = a + b; }
        else { a = ri(31, 99); b = ri(11, a - 11); c = a - b; }
        // 候选隐藏位：a / b / c 的十位或个位（key 用「前缀+位序」，0=个位）
        const cands = [];
        [[a, 'a'], [b, 'b'], [c, 'c']].forEach(function (pair) {
          const s = String(pair[0]);
          for (let i = 0; i < s.length; i++) {
            cands.push({ key: pair[1] + (s.length - 1 - i), ans: Number(s[i]) });
          }
        });
        const h = pick(cands);
        const set = new Set([h.ans]);
        let guard = 0;
        while (set.size < 4 && guard++ < 60) set.add(ri(0, 9));
        return {
          kind: 'drag', type: 'vfill',
          prompt: '把数字拖到方框里，让竖式成立',
          a: a, b: b, c: c, op: add ? '+' : '−',
          hide: h.key, ans: h.ans,
          digits: shuffle(Array.from(set))
        };
      }
    },
    {
      id: 'v-carry', unit: '1 100以内数的加减法（二）', icon: '🖐', name: '进位还是不进位',
      desc: '拖筹码判断要不要进 / 退位', kind: 'drag', round: 6,
      gen() {
        // 关键：进位和不进位各占一半，答案才会真的变化
        const need = rnd(2) === 0;
        const add = rnd(2) === 0;
        let a, b;
        if (add) {
          if (need) {                       // 个位相加满十
            const o1 = ri(3, 9), o2 = ri(10 - o1, 9);
            a = ri(1, 5) * 10 + o1; b = ri(1, 3) * 10 + o2;
          } else {                          // 个位相加不满十
            const o1 = ri(1, 4), o2 = ri(1, 9 - o1);
            a = ri(1, 5) * 10 + o1; b = ri(1, 3) * 10 + o2;
          }
        } else {
          // 减法：十位必须保证「被减数 > 减数」，否则会出现 25-32 这种负数
          const ta = ri(4, 9), tb = ri(1, ta - 1);
          if (need) {                       // 个位不够减
            const o1 = ri(1, 4), o2 = ri(o1 + 2, 9);
            a = ta * 10 + o1; b = tb * 10 + o2;
          } else {                          // 个位够减
            const o1 = ri(5, 9), o2 = ri(1, o1 - 1);
            a = ta * 10 + o1; b = tb * 10 + o2;
          }
        }
        return {
          kind: 'drag', type: 'carry',
          prompt: add ? '个位相加，需要进位吗？' : '个位不够减，需要退位吗？',
          a: a, b: b, op: add ? '+' : '\u2212', need: need
        };
      }
    },
    {
      id: 'v-mixed', unit: '1 100以内数的加减法（二）', icon: '🖐', name: '算一算（拖答案）',
      desc: '连加连减，拖答案进方框', kind: 'drag', round: 6,
      gen() {
        const k = rnd(3);
        let expr, ans;
        if (k === 0) {
          const a = ri(11, 35), b = ri(11, 30), c = ri(11, Math.max(12, 95 - a - b));
          expr = a + ' + ' + b + ' + ' + c; ans = a + b + c;   // 和 <= 95，控制在 100 以内
        } else if (k === 1) {
          const a = ri(70, 99), b = ri(11, 25), c = ri(11, a - b - 11);
          expr = a + ' \u2212 ' + b + ' \u2212 ' + c; ans = a - b - c;
        } else {
          // 关键：c 必须小于 a+b，否则 a+b-c 会算成负数（二年级不学负数）
          const a = ri(30, 60), b = ri(11, 30);
          const c = ri(6, Math.max(7, Math.min(a + b - 5, 60)));
          expr = a + ' + ' + b + ' \u2212 ' + c; ans = a + b - c;
        }
        const set = new Set([ans]);
        let g = 0;
        while (set.size < 4 && g++ < 80) {
          const v = ans + (rnd(2) ? 1 : -1) * ri(1, 9);
          if (v > 0 && v !== ans) set.add(v);
        }
        return {
          kind: 'drag', type: 'eqfill',
          prompt: '从左往右依次算，拖答案到方框里',
          expr: expr, ans: ans,
          digits: shuffle(Array.from(set))
        };
      }
    },
    {
      id: 'v-check', unit: '1 100以内数的加减法（二）', icon: '🖐', name: '验算（拖答案）',
      desc: '用减法检验加法', kind: 'drag', round: 6,
      gen() {
        const a = ri(21, 79), b = ri(11, Math.min(60, 99 - a));
        const sum = a + b;
        const set = new Set([a]);
        let g = 0;
        while (set.size < 4 && g++ < 60) {
          const v = a + (rnd(2) ? 1 : -1) * ri(1, 9);
          if (v > 0 && v !== a) set.add(v);
        }
        return {
          kind: 'drag', type: 'eqfill',
          prompt: '用减法验算：' + a + ' + ' + b + ' = ' + sum +
            '<br>那 ' + sum + ' \u2212 ' + b + ' 应该得几？',
          expr: sum + ' \u2212 ' + b, ans: a,
          digits: shuffle(Array.from(set))
        };
      }
    },
    {
      id: 'v-estimate', unit: '1 100以内数的加减法（二）', icon: '🖐', name: '估算（拖答案）',
      desc: '先估成整十数，再拖结果', kind: 'drag', round: 6,
      gen() {
        const add = rnd(2) === 0;
        let a = ri(21, 78), b = ri(11, 59);
        if (!add && b > a - 10) b = ri(11, a - 12);      // 保证减法够减
        const ra = Math.round(a / 10) * 10, rb = Math.round(b / 10) * 10;
        const est = add ? ra + rb : ra - rb;
        const exact = add ? a + b : a - b;
        // 把精确答案也放进去，逼孩子区分「≈」和「＝」
        const set = new Set([est, exact]);
        const DELTAS = [-20, -10, 10, 20, -30, 30];
        let g = 0;
        while (set.size < 4 && g++ < 140) {
          const v = est + DELTAS[(Math.random() * DELTAS.length) | 0];
          if (v > 0 && v !== est) set.add(v);
        }
        // 兜底：还差就补相邻的数，保证一定有 4 个可拖数字
        let kk = 1;
        while (set.size < 4 && kk < 25) {
          if (est + kk > 0) set.add(est + kk);
          kk++;
        }
        return {
          kind: 'drag', type: 'eqfill',
          prompt: '先估成整十数：' + a + ' \u2248 ' + ra + '，' + b + ' \u2248 ' + rb,
          expr: ra + (add ? ' + ' : ' \u2212 ') + rb, ans: est,
          digits: shuffle(Array.from(set))
        };
      }
    },
    {
      id: 'mine-sum', unit: '1 100以内数的加减法（二）', icon: '\uD83D\uDC8E', name: '宝石矿工 · 凑数',
      desc: '点两块石头凑出目标数', kind: 'mine',
      mine: { targets: [20, 50, 100], timeSec: 50, cols: 4 }
    },

    /* ========== 2. 欢乐购物街 ========== */
    {
      id: 'rmb-unit', unit: '2 欢乐购物街', icon: '💰', name: '认币分类（拖拽）',
      desc: '把钱币拖到「元 / 角 / 分」筐里', kind: 'drag', round: 5,
      gen() {
        const BINS = [
          { accept: 'yuan', label: '\u5143' },
          { accept: 'jiao', label: '\u89d2' },
          { accept: 'fen', label: '\u5206' }
        ];
        const POOL = {
          yuan: ['1 \u5143', '5 \u5143', '10 \u5143', '20 \u5143'],
          jiao: ['1 \u89d2', '2 \u89d2', '5 \u89d2'],
          fen: ['1 \u5206', '2 \u5206', '5 \u5206']
        };
        const EMO = { yuan: '💴', jiao: '🪙', fen: '\u26AA' };
        // 每个筐至少放 1 个，总数 4~6 个
        const items = [];
        const keys = shuffle(['yuan', 'jiao', 'fen']);
        keys.forEach(function (k, ki) {
          const n = ki === 0 ? ri(2, 3) : ri(1, 2);
          const pool = shuffle(POOL[k].slice()).slice(0, n);
          pool.forEach(function (lb) {
            items.push({ emoji: EMO[k], label: lb, group: k });
          });
        });
        return {
          kind: 'drag', type: 'classify',
          prompt: '这些钱该放进哪个筐？<br>元、角、分是人民币的三个单位',
          items: shuffle(items),
          bins: BINS
        };
      }
    },
    {
      id: 'rmb-conv', unit: '2 欢乐购物街', icon: '🔁', name: '人民币换算连线',
      desc: '把等值的钱连起来', kind: 'drag', round: 5,
      gen() {
        const pairs = [
          { a: '1 元', b: '10 角' }, { a: '2 元', b: '20 角' },
          { a: '5 元', b: '50 角' }, { a: '3 元', b: '30 角' },
          { a: '4 元', b: '40 角' }, { a: '2 元 5 角', b: '25 角' },
          { a: '1 元 5 角', b: '15 角' }
        ];
        const n = ri(2, 3);
        const use = shuffle(pairs.slice()).slice(0, n);
        return {
          kind: 'drag', type: 'link',
          prompt: '把同样多的钱连起来（共 ' + n + ' 对）',
          left: use.map(function (x) { return { emoji: '💴', label: x.a }; }),
          right: shuffle(use.map(function (x) { return { emoji: '🪙', label: x.b }; }))
        };
      }
    },

    {
      id: 'pay-drag', unit: '2 欢乐购物街', icon: '🖐️', name: '拖钱币付钱',
      desc: '把币拖到收银台凑够钱', kind: 'drag', round: 6,
      gen() {
        const bag = pick([
          [1, 1, 2, 5, 10], [1, 2, 5, 5, 10], [1, 1, 5, 10, 10],
          [2, 2, 5, 10, 20], [1, 2, 2, 5, 10]
        ]);
        const picks = shuffle(bag.slice()).slice(0, ri(2, 3));
        const price = picks.reduce(function (a, b) { return a + b; }, 0);
        const item = pick(['🧸 玩具', '📚 图书', '✏️ 铅笔盒', '⚽ 皮球', '🎁 礼物']);
        return {
          kind: 'drag', type: 'pay',
          prompt: '🛒 ' + item + ' 要 <b>' + price + ' 元</b><br>把下面的钱币拖到收银台付款',
          price: price,
          coins: bag
        };
      }
    },

    /* ========== 3. 表内乘法 ========== */
    {
      id: 'mul-intro', unit: '3 表内乘法', icon: '✖️', name: '分苹果（乘法的意义）',
      desc: '把苹果平均分到盘子里', kind: 'drag', round: 4,
      gen() {
        const per = ri(2, 5), boxes = ri(2, 4);
        const total = per * boxes;
        const emoji = pick(['🍎', '🍊', '🍪', '⭐']);
        return {
          kind: 'drag', type: 'group',
          prompt: '把 ' + total + ' 个 ' + emoji + ' 平均放到 ' + boxes + ' 个盘子里',
          total: total, boxes: boxes, emoji: emoji
        };
      }
    },
    {
      id: 'mul-names', unit: '3 表内乘法', icon: '🏷️', name: '算式的读写与名称',
      desc: '乘数 × 乘数 = 积',
      gen() {
        const a = ri(2, 9), b = ri(2, 9), p = a * b;
        const QS = [
          { q: a + ' × ' + b + ' = ' + p + ' 中，' + p + ' 叫什么？', a: '积', o: ['乘数', '和', '差'] },
          { q: a + ' × ' + b + ' = ' + p + ' 中，' + a + ' 叫什么？', a: '乘数', o: ['积', '被乘数', '和'] },
          { q: '乘法算式中，两个乘数相乘的结果叫？', a: '积', o: ['和', '差', '商'] },
          { q: a + ' × ' + b + ' = ' + p + ' 读作？', a: a + ' 乘 ' + b + ' 等于 ' + p,
            o: [a + ' 加 ' + b + ' 等于 ' + p, a + ' 除以 ' + b + ' 等于 ' + p, a + ' 乘 ' + p + ' 等于 ' + b] }
        ];
        const it = pick(QS);
        return { prompt: '<div class="ask">' + it.q + '</div>',
                 options: strOptions(it.a, it.o), ans: it.a };
      }
    },
    {
      id: 'mul-match-26', unit: '3 表内乘法', icon: '💥', name: '乘法消除 · 2~6 口诀',
      desc: '点选 3 块凑算式，消除得分', kind: 'match',
      match: { rows: 8, cols: 6, factorRange: [2, 6], maxVal: 36, timeSec: 120, targetScore: 160 }
    },
    {
      id: 'mul-match-79', unit: '3 表内乘法', icon: '💥', name: '乘法消除 · 7~9 口诀',
      desc: '点选 3 块凑算式，消除得分', kind: 'match',
      match: { rows: 8, cols: 6, factorRange: [7, 9], maxVal: 81, timeSec: 120, targetScore: 260 }
    },
    {
      id: 'mul-match-all', unit: '3 表内乘法', icon: '🔥', name: '乘法消除 · 全口诀挑战',
      desc: '2~9 混合，冲高分', kind: 'match',
      match: { rows: 8, cols: 6, factorRange: [2, 9], maxVal: 81, timeSec: 150, targetScore: 320 }
    },
    {
      id: 'balance-mul', unit: '3 表内乘法', icon: '\u2696', name: '乘法天平',
      desc: '拖数字让天平平衡', kind: 'drag', round: 6,
      gen() {
        const a = ri(2, 9), b = ri(2, 9);
        const ans = a * b;
        const set = new Set([ans]);
        let g = 0;
        while (set.size < 4 && g++ < 80) {
          // 干扰项特意用「常见的口诀记错」：多一个 a 或少一个 a / b
          const mode = rnd(3);
          let v;
          if (mode === 0) v = ans + a;
          else if (mode === 1) v = ans - a;
          else v = ans + (rnd(2) ? b : -b);
          if (v > 0 && v !== ans && v <= 81) set.add(v);
        }
        let k = 1;
        while (set.size < 4 && k < 25) { if (ans + k <= 90) set.add(ans + k); k++; }
        return {
          kind: 'drag', type: 'balance',
          prompt: '左盘是 ' + a + ' × ' + b + '，拖一个数到右盘让它平衡',
          leftText: a + ' × ' + b,
          ans: ans,
          options: shuffle(Array.from(set))
        };
      }
    },
    {
      id: 'mul-apply', unit: '3 表内乘法', icon: '📝', name: '每盘放几个（拖苹果）',
      desc: '按每盘的数量摆放，再看乘法', kind: 'drag', round: 4,
      gen() {
        const per = ri(2, 6), boxes = ri(2, 4);
        const emoji = pick(['🍎', '🍊', '🍪', '\u2B50']);
        return {
          kind: 'drag', type: 'fill',
          prompt: '每盘放 ' + per + ' 个，一共 ' + boxes + ' 盘<br>摆好之后再想想：怎么用乘法算出一共几个？',
          per: per, boxes: boxes, emoji: emoji
        };
      }
    },
    {
      id: 'mul-addsub', unit: '3 表内乘法', icon: '🧩', name: '乘加乘减（拖答案）',
      desc: '先算乘法，再算加减', kind: 'drag', round: 6,
      gen() {
        const a = ri(2, 6), b = ri(2, 6), c = ri(1, 9);
        let expr, ans;
        if (rnd(2) === 0) {
          expr = a + ' \u00D7 ' + b + ' + ' + c; ans = a * b + c;
        } else {
          const base = a * b, d = ri(1, Math.max(1, base - 1));
          expr = a + ' \u00D7 ' + b + ' \u2212 ' + d; ans = base - d;
        }
        const set = new Set([ans]);
        let g = 0;
        while (set.size < 4 && g++ < 80) {
          const v = ans + (rnd(2) ? 1 : -1) * ri(1, 9);
          if (v > 0 && v !== ans) set.add(v);
        }
        return {
          kind: 'drag', type: 'eqfill',
          prompt: '先算乘法，再算加减。拖答案到方框',
          expr: expr, ans: ans,
          digits: shuffle(Array.from(set))
        };
      }
    },

    /* ========== 4. 我的学校我的家 ========== */
    {
      id: 'direction', unit: '4 我的学校我的家', icon: '🧭', name: '方向迷宫',
      desc: '按方向键把小人走到家', kind: 'drag', round: 5,
      gen() {
        const size = 5;
        let st, gl, guard = 0;
        do {
          st = { r: ri(0, size - 1), c: ri(0, size - 1) };
          gl = { r: ri(0, size - 1), c: ri(0, size - 1) };
          guard++;
        } while ((Math.abs(st.r - gl.r) + Math.abs(st.c - gl.c)) < 3 && guard < 80);
        return {
          kind: 'drag', type: 'maze',
          prompt: '🧒 要走到 🏠<br>点方向键移动，先想清楚往哪边走',
          size: size, start: st, goal: gl
        };
      }
    },
    {
      id: 'route', unit: '4 我的学校我的家', icon: '🗺️', name: '放在正确方位',
      desc: '把地点拖到「我家的哪一面」', kind: 'drag', round: 5,
      gen() {
        const pool = [
          { emoji: '🏫', label: '学校' }, { emoji: '🏥', label: '医院' },
          { emoji: '🏪', label: '超市' }, { emoji: '🌳', label: '公园' },
          { emoji: '📮', label: '邮局' }, { emoji: '🏦', label: '银行' }
        ];
        const used = shuffle(pool.slice()).slice(0, ri(2, 4));
        const dirs = shuffle(['北', '东', '南', '西']);
        used.forEach(function (it, i) { it.dir = dirs[i % 4]; });
        return {
          kind: 'drag', type: 'place',
          prompt: '中间是 🏠 我家<br>' + used.map(function (x) {
            return x.emoji + x.label + ' 在我家的' + x.dir + '面';
          }).join('　·　'),
          items: used
        };
      }
    },
    {
      id: 'left-right', unit: '4 我的学校我的家', icon: '👐', name: '排到正确位置',
      desc: '从左数第几个位置', kind: 'drag', round: 5,
      gen() {
        const person = pick([
          { emoji: '🧒', name: '小明' }, { emoji: '👧', name: '小红' },
          { emoji: '👦', name: '小刚' }, { emoji: '👶', name: '小丽' }
        ]);
        const slots = ri(4, 6);
        const answer = ri(1, slots);
        return {
          kind: 'drag', type: 'seat',
          prompt: '把 ' + person.emoji + ' ' + person.name + ' 拖到<b>从左数第 ' + answer + ' 个</b>位置',
          slots: slots, answer: answer, person: person
        };
      }
    },

    /* ========== 5. 分类 ========== */
    {
      id: 'stats-table', unit: '5 分类', icon: '👆', name: '点一点，数一数',
      desc: '点水果计数，统计表自己长出来', kind: 'drag', round: 5,
      gen() {
        const all = [
          { emoji: '🍎', label: '苹果' }, { emoji: '🍌', label: '香蕉' },
          { emoji: '🍊', label: '橘子' }, { emoji: '🍇', label: '葡萄' }
        ];
        const use = shuffle(all.slice()).slice(0, ri(2, 3));
        const items = [];
        use.forEach(function (g) {
          const k = ri(3, 7);
          for (let i = 0; i < k; i++) items.push({ emoji: g.emoji, group: g.label });
        });
        return {
          kind: 'drag', type: 'count',
          prompt: '点一下每个水果，数数各有多少个（共 ' + items.length + ' 个）',
          items: shuffle(items),
          groups: use
        };
      }
    },

    {
      id: 'classify-drag', unit: '5 分类', icon: '🖐️', name: '拖拽分类（动手版）',
      desc: '把图形拖进对应的筐', kind: 'drag', round: 6,
      gen() {
        const pools = [
          [{ g: 'apple', label: '苹果 🍎', emoji: '🍎' }, { g: 'banana', label: '香蕉 🍌', emoji: '🍌' }],
          [{ g: 'red', label: '红色 🔴', emoji: '🔴' }, { g: 'blue', label: '蓝色 🔵', emoji: '🔵' }],
          [{ g: 'round', label: '圆形 🟡', emoji: '🟡' }, { g: 'square', label: '方块 🟦', emoji: '🟦' }]
        ];
        const pool = pick(pools);
        const items = [];
        pool.forEach(function (x) {
          const n = ri(2, 4);
          for (let i = 0; i < n; i++) items.push({ emoji: x.emoji, group: x.g });
        });
        return {
          kind: 'drag', type: 'classify',
          prompt: '把 ' + items.length + ' 个图形拖到对应的筐里',
          items: shuffle(items),
          bins: pool.map(function (x) { return { label: x.label, accept: x.g }; })
        };
      }
    },

    /* ========== 6. 数学广场 ========== */
    {
      id: 'combo', unit: '6 数学广场', icon: '🔗', name: '搭配连线',
      desc: '把每一种搭配都连出来', kind: 'drag', round: 5,
      gen() {
        const topPool = [
          { emoji: '👕', label: 'T恤' }, { emoji: '👔', label: '衬衫' },
          { emoji: '🧥', label: '外套' }
        ];
        const botPool = [{ emoji: '👖', label: '长裤' }, { emoji: '🩳', label: '短裤' }];
        const left = shuffle(topPool.slice()).slice(0, ri(2, 3));
        const right = shuffle(botPool.slice());
        return {
          kind: 'drag', type: 'link',
          prompt: '有 ' + left.length + ' 件上衣、' + right.length + ' 条下装<br>每一种搭配都连一次（共 ' +
            left.length * right.length + ' 种）',
          left: left, right: right
        };
      }
    },
    {
      id: 'reasoning', unit: '6 数学广场', icon: '🖐', name: '排一排（推理）',
      desc: '按线索把人从高到矮排好', kind: 'drag', round: 5,
      gen() {
        const pool = [
          { emoji: '🧒', name: '小明' }, { emoji: '👦', name: '小刚' },
          { emoji: '👧', name: '小红' }, { emoji: '👶', name: '小丽' }
        ];
        const people = shuffle(pool.slice()).slice(0, 3);
        const ranks = shuffle([1, 2, 3]);
        people.forEach(function (p, i) { p.rank = ranks[i]; });
        const sorted = people.slice().sort(function (x, y) { return y.rank - x.rank; });
        const clues = [];
        for (let i = 0; i < sorted.length - 1; i++) {
          clues.push(sorted[i].name + ' 比 ' + sorted[i + 1].name + ' 高');
        }
        return {
          kind: 'drag', type: 'order',
          prompt: clues.join('<br>') + '<br><span class="hint">把他们从高到矮排成一排</span>',
          people: people
        };
      }
    }
  ];

  /* ================= 存储 ================= */
  const KEY = 'mathplay.g2.v2';   // v2：知识点按沪教五四学制图谱重排

  /* ---------- 家长锁：由家长按学校进度逐个单元解锁 ---------- */
  const PASSCODE = '2468';
  const LOCKED_UNITS = ['2 欢乐购物街', '3 表内乘法', '4 我的学校我的家', '5 分类'];
  function isLocked(unit) {
    return LOCKED_UNITS.indexOf(unit) >= 0 && DB.unlocked.indexOf(unit) < 0;
  }
  function unlock(unit) {
    if (DB.unlocked.indexOf(unit) < 0) { DB.unlocked.push(unit); save(); }
  }

  /* 家长密码弹窗 */
  function askPasscode(unit) {
    const mask = document.createElement('div');
    mask.className = 'lock-mask';
    const shortName = unit.slice(unit.indexOf(' ') + 1);
    mask.innerHTML =
      '<div class="lock-box">' +
        '<div class="lock-icon">\ud83d\udd12</div>' +
        '<div class="lock-title">' + shortName + '</div>' +
        '<div class="lock-sub">这一单元还没有解锁<br>请输入家长密码</div>' +
        '<input class="lock-input" id="lockInput" type="tel" inputmode="numeric" ' +
          'maxlength="4" placeholder="····" autocomplete="off">' +
        '<div class="lock-err" id="lockErr"></div>' +
        '<div class="lock-actions">' +
          '<button class="lock-btn ghost" id="lockCancel">取消</button>' +
          '<button class="lock-btn primary" id="lockOk">解锁</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    const input = mask.querySelector('#lockInput');
    const err = mask.querySelector('#lockErr');
    setTimeout(function () { try { input.focus(); } catch (e) { } }, 120);

    function close() { if (mask.parentNode) document.body.removeChild(mask); }
    function submit() {
      if (input.value === PASSCODE) {
        unlock(unit);
        close();
        renderHome();          // 先刷新界面；音效即使失败也不该挡住刷新
        try { window.Sfx.win(); } catch (e) { }
      } else {
        err.textContent = '密码不对，再试一次';
        input.value = '';
        input.classList.add('shake');
        setTimeout(function () { input.classList.remove('shake'); }, 460);
        try { window.Sfx.bad(); } catch (e) { }
      }
    }
    mask.querySelector('#lockOk').addEventListener('click', submit);
    mask.querySelector('#lockCancel').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }

   // v2：知识点按沪教五四学制图谱重排
  let DB = { stars: 0, answered: 0, correct: 0, days: {}, modes: {}, unlocked: [] };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && !Array.isArray(DB.unlocked)) DB.unlocked = [];
      if (raw) DB = Object.assign(DB, JSON.parse(raw));
    } catch (e) { }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { } }
  function record(correct, stars, modeId) {
    const k = todayKey();
    const d = DB.days[k] || (DB.days[k] = { answered: 0, correct: 0, stars: 0 });
    d.answered++; if (correct) d.correct++; d.stars += stars;
    const m = DB.modes[modeId] || (DB.modes[modeId] = { answered: 0, correct: 0 });
    m.answered++; if (correct) m.correct++;
    DB.answered++; if (correct) DB.correct++; DB.stars += stars;
  }

  /* ================= 状态机 ================= */
  const ROUND = 10;
  let cur = null;
  function show(id) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    $(id).classList.add('active');
  }

  function startRound(modeId) {
    const m = MODES.find((x) => x.id === modeId) || MODES[0];
    if (m.kind === 'match') return startMatch(m);
    if (m.kind === 'mine') return startMine(m);
    // 拖拽型玩法一次操作量大，轮次短一些（默认 10 题）
    cur = { mode: m, idx: 0, total: m.round || ROUND, q: null, stars: 0, correct: 0, combo: 0, locked: false };
    audio();
    show('#view-quiz');
    nextQuestion();
  }

  // 消除玩法：限时一局定输赢，不走 10 题循环
  function startMatch(m) {
    cur = { mode: m, idx: 0, total: 1, q: null, stars: 0, correct: 0, combo: 0, locked: false };
    audio();
    show('#view-quiz');
    $('#stageTag').textContent = m.name;
    $('#progress').style.width = '100%';
    $('#quizStars').textContent = '0';
    $('#feedback').textContent = '';
    $('#feedback').className = 'feedback';
    $('#question').innerHTML = '';
    const wrap = $('#answers');
    wrap.innerHTML = '';
    wrap.style.gridTemplateColumns = '';
    if (window.__mgActive) window.__mgActive();   // 清掉上一局残留的计时器
    window.MatchEngine.mount($('#question'), m.match, function (res) {
      cur.stars = res.stars;
      record(res.stars > 0, res.stars, m.id);
      save();
      const s = res.stars;
      $('#resultEmoji').textContent = s >= 3 ? '🏆' : s === 2 ? '🎉' : s === 1 ? '👍' : '💪';
      $('#resultTitle').textContent = s >= 3 ? '满分！太厉害了' : s === 2 ? '真棒！' : s === 1 ? '过关！' : '再来一次吧';
      $('#resultStars').textContent = '★'.repeat(s) + '☆'.repeat(3 - s);
      $('#resultSub').textContent = '「' + m.name + '」得分 ' + res.score +
        '（目标 ' + m.match.targetScore + '）　·　消掉 ' + res.matched + ' 组';
      show('#view-result');
    });
  }

  // 宝石矿工：限时多关，一局定输赢
  function startMine(m) {
    cur = { mode: m, idx: 0, total: 1, q: null, stars: 0, correct: 0, combo: 0, locked: false };
    audio();
    show('#view-quiz');
    $('#stageTag').textContent = m.name;
    $('#progress').style.width = '100%';
    $('#quizStars').textContent = '0';
    $('#feedback').textContent = '';
    $('#feedback').className = 'feedback';
    $('#question').innerHTML = '';
    const wrap = $('#answers');
    wrap.innerHTML = '';
    wrap.style.gridTemplateColumns = '';
    if (window.__mgActive) window.__mgActive();
    const g = window.MineGame.mount($('#question'), m.mine, function (res) {
      cur.stars = res.stars;
      record(res.stars > 0, res.stars, m.id);
      save();
      const st = res.stars;
      $('#resultEmoji').textContent = st >= 3 ? '\uD83C\uDFC6' : st === 2 ? '\uD83C\uDF89' : st === 1 ? '\uD83D\uDC4D' : '\uD83D\uDCAA';
      $('#resultTitle').textContent = st >= 3 ? '矿工之王！' : st === 2 ? '挖得不错！' : st === 1 ? '过关！' : '再来一次吧';
      $('#resultStars').textContent = '\u2605'.repeat(st) + '\u2606'.repeat(3 - st);
      $('#resultSub').textContent = '「' + m.name + '」挖到 ' + res.score + ' 颗宝石　·　消掉 ' + res.hits + ' 组';
      show('#view-result');
    });
    window.__mgActive = function () { if (g && g.stop) g.stop(); };
  }

  function nextQuestion() {
    if (cur.idx >= cur.total) return finishRound();
    const q = cur.mode.gen();
    if (q.options) {
      const opts = q.options.slice();
      if (opts.indexOf(q.ans) < 0) opts.push(q.ans);
      q.options = shuffle(opts);
    }
    cur.q = q;
    renderQuestion();
  }

  function renderQuestion() {
    const q = cur.q;
    cur.locked = false;
    $('#stageTag').textContent = cur.mode.name;
    $('#progress').style.width = (cur.idx / cur.total * 100) + '%';
    $('#quizStars').textContent = cur.stars;
    $('#feedback').textContent = '';
    $('#feedback').className = 'feedback';

    // ---- 拖拽型：交给 DragEngine 渲染 ----
    if (q.kind === 'drag') {
      $('#question').innerHTML = '';
      const wrap = $('#answers');
      wrap.innerHTML = '';
      wrap.style.gridTemplateColumns = '';
      window.DragEngine.mount($('#question'), q, function (ok) {
        resolveAnswer(ok, '再试一次，注意题目要求');
      });
      return;
    }

    $('#question').innerHTML = q.prompt;

    const wrap = $('#answers');
    wrap.innerHTML = '';
    const longest = Math.max.apply(null, q.options.map((o) => String(o).length));
    // 三选一（如「锐角/直角/钝角」）或长文本选项 → 单列竖排，避免半行空格
    wrap.style.gridTemplateColumns = (q.options.length === 3 || longest > 5) ? '1fr' : 'repeat(2, 1fr)';
    q.options.forEach((v) => {
      const b = document.createElement('button');
      b.className = 'ans-btn' + (String(v).length > 5 ? ' text' : '');
      b.textContent = v;
      b.dataset.val = String(v);
      b.addEventListener('click', () => choose(String(v), b));
      wrap.appendChild(b);
    });
  }

  function choose(val, btn) {
    if (!cur || cur.locked) return;
    const q = cur.q;
    const ok = val === String(q.ans);
    document.querySelectorAll('.ans-btn').forEach((b) => {
      b.disabled = true;
      if (b.dataset.val === String(q.ans)) b.classList.add('correct');
    });
    if (!ok && btn) btn.classList.add('wrong');
    resolveAnswer(ok, '再看看，答案是 ' + q.ans);
  }

  // 选择题与拖拽题共用的结算入口
  function resolveAnswer(ok, failMsg) {
    if (cur.locked) return;
    cur.locked = true;
    if (ok) {
      cur.stars++; cur.correct++; cur.combo++;
      sfxOk();
      $('#feedback').className = 'feedback';
      $('#feedback').textContent = cur.combo >= 3 ? '连对 ' + cur.combo + ' 题！🔥' : '答对啦 👍';
      if (cur.combo >= 3) { sfxCombo(); popCombo(cur.combo); }
      record(true, 1, cur.mode.id);
    } else {
      cur.combo = 0;
      sfxBad();
      $('#feedback').className = 'feedback bad';
      $('#feedback').textContent = failMsg || '再试一次';
      record(false, 0, cur.mode.id);
    }
    save();
    $('#quizStars').textContent = cur.stars;
    setTimeout(() => { cur.idx++; nextQuestion(); }, ok ? 820 : 1700);
  }

  function popCombo(n) {
    const el = document.createElement('div');
    el.className = 'combo';
    el.textContent = '连对 ' + n + '！';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function finishRound() {
    $('#progress').style.width = '100%';
    const s = cur.stars;
    let emoji = '💪', title = '继续加油！', stars = '⭐'.repeat(Math.max(1, Math.round(s / 3.4)));
    const full = cur.total;
    if (s === full) { emoji = '🏆'; title = '满分！太厉害了'; stars = '⭐⭐⭐⭐⭐'; }
    else if (s >= full * 0.8) { emoji = '🎉'; title = '真棒！'; }
    else if (s >= full * 0.5) { emoji = '👍'; title = '不错哦！'; }
    if (s === full) sfxWin(); else if (s >= full * 0.8) sfxOk();
    $('#resultEmoji').textContent = emoji;
    $('#resultTitle').textContent = title;
    $('#resultStars').textContent = stars;
    $('#resultSub').textContent = '「' + cur.mode.name + '」答对 ' + s + ' / ' + full + ' 题　·　获得 ' + s + ' 颗星';
    show('#view-result');
  }

  /* ================= 首页 ================= */
  let currentUnit = null;

  // 首页：只列 6 个大类（不再把所有游戏平铺，下滑太累）
  function renderHome() {
    if (window.__mgActive) window.__mgActive();
    currentUnit = null;
    const box = $('#unitList');
    box.innerHTML = '';
    const units = [];
    MODES.forEach((m) => { if (units.indexOf(m.unit) < 0) units.push(m.unit); });

    units.forEach((u) => {
      const list = MODES.filter((m) => m.unit === u);
      let played = 0, answered = 0, correct = 0;
      list.forEach((m) => {
        const st = DB.modes[m.id];
        if (st && st.answered) { played++; answered += st.answered; correct += st.correct; }
      });
      const acc = answered ? Math.round(correct / answered * 100) + '%' : '—';
      const sp = u.indexOf(' ');
      const locked = isLocked(u);
      const card = document.createElement('button');
      card.className = 'unit-card' + (locked ? ' locked' : '');
      if (locked) {
        card.innerHTML =
          '<span class="uc-badge lock">\ud83d\udd12</span>' +
          '<span class="uc-body"><span class="uc-name">' + u.slice(sp + 1) + '</span>' +
          '<span class="uc-meta">未解锁　·　请家长输入密码</span></span>' +
          '<span class="uc-arrow">\ud83d\udd12</span>';
        card.addEventListener('click', function () { askPasscode(u); });
      } else {
        card.innerHTML =
          '<span class="uc-badge">' + u.slice(0, sp) + '</span>' +
          '<span class="uc-body"><span class="uc-name">' + u.slice(sp + 1) + '</span>' +
          '<span class="uc-meta">' + list.length + ' 个游戏　·　已练 ' + played +
          ' 个　·　正确率 ' + acc + '</span></span>' +
          '<span class="uc-arrow">\u203a</span>';
        card.addEventListener('click', function () { renderUnit(u); });
      }
      box.appendChild(card);
    });

    if ($('#verTag')) $('#verTag').textContent = VER;
    $('#homeStars').textContent = DB.stars;
    $('#homeDays').textContent = Object.keys(DB.days).length;
    $('#homeAcc').textContent = DB.answered ? Math.round(DB.correct / DB.answered * 100) + '%' : '—';
    show('#view-home');
  }

  // 单元内页：只显示这一大类下的游戏
  function renderUnit(unitName) {
    if (window.__mgActive) window.__mgActive();
    currentUnit = unitName;
    const sp = unitName.indexOf(' ');
    $('#unitTitle').textContent = unitName.slice(sp + 1);

    const list = MODES.filter((m) => m.unit === unitName);
    const box = $('#modeList');
    box.innerHTML = '';
    list.forEach((m) => {
      const b = document.createElement('button');
      b.className = 'mode-btn';
      const st = DB.modes[m.id];
      const acc = st && st.answered ? ' · 正确率 ' + Math.round(st.correct / st.answered * 100) + '%' : '';
      b.innerHTML = '<span class="m-emoji">' + m.icon + '</span>' +
        '<span class="m-meta"><span>' + m.name + '</span>' +
        '<span class="m-desc">' + m.desc + acc + '</span></span>';
      b.addEventListener('click', () => startRound(m.id));
      box.appendChild(b);
    });

    let answered = 0, correct = 0;
    list.forEach((m) => { const st = DB.modes[m.id]; if (st) { answered += st.answered; correct += st.correct; } });
    $('#unitStats').innerHTML =
      '<div class="stat"><span class="stat-num">' + list.length + '</span><span class="stat-lbl">个游戏</span></div>' +
      '<div class="stat"><span class="stat-num">' + answered + '</span><span class="stat-lbl">累计答题</span></div>' +
      '<div class="stat"><span class="stat-num">' + (answered ? Math.round(correct / answered * 100) + '%' : '—') +
      '</span><span class="stat-lbl">正确率</span></div>';
    $('#unitStars').textContent = DB.stars;
    show('#view-unit');
  }

  function renderParent() {
    const acc = DB.answered ? Math.round(DB.correct / DB.answered * 100) + '%' : '—';
    $('#parentStats').innerHTML =
      '<div class="p-row"><span>总星星</span><span>' + DB.stars + '</span></div>' +
      '<div class="p-row"><span>累计答题</span><span>' + DB.answered + ' 题</span></div>' +
      '<div class="p-row"><span>累计正确率</span><span>' + acc + '</span></div>' +
      '<div class="p-row"><span>练习天数</span><span>' + Object.keys(DB.days).length + ' 天</span></div>';

    const keys = Object.keys(DB.days).sort().reverse().slice(0, 7);
    $('#parentDaily').innerHTML = '<div class="card-title">最近 7 天</div>' + (keys.length ? keys.map((k) => {
      const d = DB.days[k];
      const r = d.answered ? Math.round(d.correct / d.answered * 100) + '%' : '—';
      return '<div class="day-row"><span class="d">' + k + '</span><span>' + d.answered +
        ' 题 · 正确率 ' + r + ' · ⭐' + d.stars + '</span></div>';
    }).join('') : '<div class="p-row"><span>还没有练习记录</span><span>—</span></div>');

    const rows = MODES.filter((m) => DB.modes[m.id] && DB.modes[m.id].answered >= 5)
      .map((m) => {
        const s = DB.modes[m.id];
        return { unit: m.unit.slice(0, 1), name: m.name, r: Math.round(s.correct / s.answered * 100), n: s.answered };
      }).sort((a, b) => a.r - b.r);
    $('#parentModes').innerHTML = '<div class="card-title">知识点掌握（至少 5 题）</div>' +
      (rows.length ? rows.map((x) => '<div class="day-row"><span class="d">' + x.unit + ' · ' + x.name +
        '</span><span>' + x.r + '% (' + x.n + '题) ' + (x.r >= 85 ? '✅' : x.r >= 60 ? '⚠️' : '❗') +
        '</span></div>').join('') : '<div class="p-row"><span>数据还不够</span><span>—</span></div>');
    
    const pv = document.getElementById('parentEnv');
    if (pv) pv.textContent = '版本 ' + VER + '　|　' + envText();
    show('#view-parent');
  }

  /* ================= 键盘 ================= */
  document.addEventListener('keydown', (e) => {
    if ($('#view-quiz').classList.contains('active')) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        const btns = document.querySelectorAll('.ans-btn');
        if (btns[n - 1] && !btns[n - 1].disabled) btns[n - 1].click();
      }
    } else if (e.key === 'Enter' && $('#view-result').classList.contains('active')) {
      $('#btnAgain').click();
    }
  });

  /* ================= 事件 ================= */
  $('#btnQuit').addEventListener('click', () => {
    if (currentUnit) renderUnit(currentUnit); else renderHome();
  });
  $('#btnUnitBack').addEventListener('click', renderHome);
  $('#btnAgain').addEventListener('click', () => startRound(cur ? cur.mode.id : MODES[0].id));
  $('#btnBackHome').addEventListener('click', () => {
    if (currentUnit) renderUnit(currentUnit); else renderHome();
  });
  $('#btnParent').addEventListener('click', renderParent);
  $('#btnParentBack').addEventListener('click', renderHome);
  const relockBtn = $('#btnRelock');
  if (relockBtn) {
    relockBtn.addEventListener('click', function () {
      if (confirm('要重新锁上 2~5 单元吗？\n（锁上后需要家长密码才能再打开）')) {
        DB.unlocked = [];
        save();
        renderParent();
      }
    });
  }
  $('#btnReset').addEventListener('click', () => {
    if (confirm('确定清空全部练习记录？')) {
      DB = { stars: 0, answered: 0, correct: 0, days: {}, modes: {} };
      save(); renderParent();
    }
  });

  /* ================= 启动 ================= */
  // 供 drag.js 调用音效
  window.Sfx = {
    ok: sfxOk, bad: sfxBad, win: sfxWin, combo: sfxCombo,
    tick: function () { tone(880, 0, 0.06, 'sine', 0.05); }
  };
  load();
  initDebugLog();
  renderHome();
})();
