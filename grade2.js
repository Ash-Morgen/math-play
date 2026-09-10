/* 二年级上 · 同步闯关（沪教版 · 五四学制）
   知识点清单来源：WorkBuddy/Claw/sh-kg 沪教版知识图谱（math_2a_shj，7 章 22 知识点）
   题目全部算法生成，仅借鉴知识点与题型设计，不抄录教材原文。 */
(function () {
  'use strict';
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
      id: 'v-add', unit: '1 100以内数的加减法（二）', icon: '➕', name: '两位数加减竖式',
      desc: '竖式对齐，从个位算起',
      gen() {
        const add = rnd(2) === 0;
        if (add) {
          const a = ri(11, 60), b = ri(11, 99 - a), ans = a + b;
          return {
            prompt: vertical(a, b, '+') +
              '<div class="ask">列竖式算一算，得多少？<br>' +
              '<span class="hint">相同数位对齐，从个位加起</span></div>',
            options: numOptions(ans), ans: String(ans)
          };
        }
        const a = ri(31, 99), b = ri(11, a - 11), ans = a - b;
        return {
          prompt: vertical(a, b, '−') +
            '<div class="ask">列竖式算一算，得多少？<br>' +
            '<span class="hint">相同数位对齐，从个位减起</span></div>',
          options: numOptions(ans), ans: String(ans)
        };
      }
    },
    {
      id: 'v-carry', unit: '1 100以内数的加减法（二）', icon: '🔄', name: '进位与退位',
      desc: '判断要不要进 / 退位',
      gen() {
        const add = rnd(2) === 0;
        if (add) {
          // 构造个位相加 ≥10 的加法
          const o1 = ri(3, 9), o2 = ri(10 - o1, 9);
          const t1 = ri(1, 5), t2 = ri(1, 3);
          const a = t1 * 10 + o1, b = t2 * 10 + o2;
          const ans = a + b;
          return {
            prompt: vertical(a, b, '+') +
              '<div class="ask">个位 ' + o1 + ' + ' + o2 + ' = ' + (o1 + o2) + '<br>' +
              '个位满十，要向十位进几？</div>',
            options: shuffle(['1', '0', '2', '10']), ans: '1'
          };
        }
        const o1 = ri(1, 4), o2 = ri(o1 + 2, 9);
        const t1 = ri(4, 9), t2 = ri(1, 3);
        const a = t1 * 10 + o1, b = t2 * 10 + o2;
        return {
          prompt: vertical(a, b, '−') +
            '<div class="ask">个位 ' + o1 + ' 不够减 ' + o2 + '<br>' +
            '要从十位退几当十？</div>',
          options: shuffle(['1', '0', '2', '10']), ans: '1'
        };
      }
    },
    {
      id: 'v-mixed', unit: '1 100以内数的加减法（二）', icon: '🔗', name: '连加、连减与混合',
      desc: '28 + 34 + 22',
      gen() {
        const k = rnd(3);
        if (k === 0) {
          const a = ri(11, 35), b = ri(11, 30), c = ri(11, Math.max(12, 95 - a - b));
          const ans = a + b + c;
          return {
            prompt: '<div class="ask">' + a + ' + ' + b + ' + ' + c + ' = ?<br>' +
              '<span class="hint">可以列一个连加竖式，也可以分两步</span></div>',
            options: numOptions(ans), ans: String(ans)
          };
        }
        if (k === 1) {
          const a = ri(70, 99), b = ri(11, 25), c = ri(11, a - b - 11);
          const ans = a - b - c;
          return {
            prompt: '<div class="ask">' + a + ' − ' + b + ' − ' + c + ' = ?<br>' +
              '<span class="hint">从左往右依次减</span></div>',
            options: numOptions(ans), ans: String(ans)
          };
        }
        const a = ri(30, 60), b = ri(11, 30), c = ri(11, Math.max(12, 99 - a - b));
        const ans = a + b - c;
        return {
          prompt: '<div class="ask">' + a + ' + ' + b + ' − ' + c + ' = ?<br>' +
            '<span class="hint">先加后减，按顺序算</span></div>',
          options: numOptions(ans), ans: String(ans)
        };
      }
    },
    {
      id: 'v-check', unit: '1 100以内数的加减法（二）', icon: '✅', name: '加减法的验算',
      desc: '用减法检验加法',
      gen() {
        const a = ri(21, 60), b = ri(11, 99 - a), sum = a + b;
        const correct = sum + ' − ' + b + ' = ' + a;
        return {
          prompt: '<div class="ask">小明算：' + a + ' + ' + b + ' = ' + sum + '<br>' +
            '下面哪个式子可以用来验算？</div>',
          options: strOptions(correct, [
            sum + ' + ' + b + ' = ' + a,
            a + ' − ' + b + ' = ' + sum,
            sum + ' + ' + a + ' = ' + b
          ]),
          ans: correct
        };
      }
    },
    {
      id: 'v-estimate', unit: '1 100以内数的加减法（二）', icon: '📏', name: '加减法的估算',
      desc: '估成整十数再算',
      gen() {
        const add = rnd(2) === 0;
        const t1 = ri(2, 6), t2 = ri(2, 3);
        const o1 = ri(1, 4), o2 = ri(1, 4);
        const a = t1 * 10 + o1, b = t2 * 10 + o2;
        if (add) {
          const ans = (t1 + t2) * 10;
          return {
            prompt: '<div class="ask">' + a + ' + ' + b + ' 大约是多少？<br>' +
              '<span class="hint">' + a + ' 接近 ' + t1 * 10 + '，' + b + ' 接近 ' + t2 * 10 + '</span></div>',
            options: tensOptions(ans), ans: String(ans)
          };
        }
        const tt1 = ri(5, 9), tt2 = ri(2, 3);
        const a2 = tt1 * 10 + ri(1, 4), b2 = tt2 * 10 + ri(1, 4);
        const ans = (tt1 - tt2) * 10;
        return {
          prompt: '<div class="ask">' + a2 + ' − ' + b2 + ' 大约是多少？<br>' +
            '<span class="hint">都估成整十数再减</span></div>',
          options: tensOptions(ans), ans: String(ans)
        };
      }
    },

    /* ========== 2. 欢乐购物街 ========== */
    {
      id: 'rmb-unit', unit: '2 欢乐购物街', icon: '💰', name: '认识人民币',
      desc: '元、角、分',
      gen() {
        const QS = [
          { q: '人民币的单位有哪几个？', a: '元、角、分', o: ['元、米、分', '角、分、厘米', '元、角、时'] },
          { q: '1 元等于多少角？', a: '10 角', o: ['5 角', '100 角', '1 角'] },
          { q: '1 角等于多少分？', a: '10 分', o: ['5 分', '100 分', '1 分'] },
          { q: '5 角 + 5 角 = ？', a: '1 元', o: ['10 元', '5 元', '1 角'] },
          { q: '人民币最大的单位是哪个？', a: '元', o: ['角', '分', '都一样'] },
          { q: '2 元 5 角 里有几个 5 角？', a: '5 个', o: ['2 个', '4 个', '25 个'] }
        ];
        const it = pick(QS);
        return { prompt: moneyHTML('💴 💰 🪙') + '<div class="ask">' + it.q + '</div>',
                 options: strOptions(it.a, it.o), ans: it.a };
      }
    },
    {
      id: 'rmb-conv', unit: '2 欢乐购物街', icon: '🔁', name: '人民币的换算',
      desc: '1元 = 10角',
      gen() {
        const k = rnd(3);
        if (k === 0) {
          const y = ri(2, 9), ans = y * 10;
          return { prompt: '<div class="ask">' + y + ' 元 = ? 角</div>',
                   options: numOptions(ans), ans: String(ans) };
        }
        if (k === 1) {
          const y = ri(2, 9), ans = y;
          return { prompt: '<div class="ask">' + (y * 10) + ' 角 = ? 元</div>',
                   options: numOptions(ans), ans: String(ans) };
        }
        const y = ri(1, 5), j = ri(1, 9), ans = y * 10 + j;
        return { prompt: '<div class="ask">' + y + ' 元 ' + j + ' 角 = ? 角</div>',
                 options: numOptions(ans), ans: String(ans) };
      }
    },
    {
      id: 'rmb-pay', unit: '2 欢乐购物街', icon: '🛒', name: '付钱与找零',
      desc: '付 10 元买 8 元，找回多少',
      gen() {
        const price = ri(2, 9);
        const payOpt = [10, 20, 50].filter((p) => p > price);
        const pay = pick(payOpt);
        const ans = pay - price;
        const items = pick(['🧸', '📚', '✏️', '🍬', '🎁', '⚽']);
        return {
          prompt: '<div class="ask">' + items + ' 一个玩具 ' + price + ' 元<br>' +
            '付了 ' + pay + ' 元，应找回多少元？</div>',
          options: numOptions(ans), ans: String(ans)
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
      id: 'mul-intro', unit: '3 表内乘法', icon: '✖️', name: '乘法的初步认识',
      desc: '相同加数连加',
      gen() {
        const g = ri(3, 6), p = ri(2, 7);
        const addList = [];
        for (let i = 0; i < g; i++) addList.push(p);
        const sumExpr = addList.join(' + ');
        const correct = g + ' 个 ' + p;
        return {
          prompt: '<div class="addline">' + sumExpr + '</div>' +
            '<div class="ask">这是几个几相加？</div>',
          options: strOptions(correct, [
            (g + 1) + ' 个 ' + p, g + ' 个 ' + (p + 1), (g - 1 > 1 ? g - 1 : g + 2) + ' 个 ' + p
          ]),
          ans: correct
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
      id: 'mul-26', unit: '3 表内乘法', icon: '🎯', name: '2~6 的乘法口诀',
      desc: '口诀求积',
      gen() {
        const a = ri(2, 6), b = ri(2, 9);
        return { prompt: '<div class="ask">' + a + ' × ' + b + ' = ?</div>',
                 options: numOptions(a * b), ans: String(a * b) };
      }
    },
    {
      id: 'mul-79', unit: '3 表内乘法', icon: '🎲', name: '7~9 的乘法口诀',
      desc: '口诀求积',
      gen() {
        const a = ri(7, 9), b = ri(2, 9);
        return { prompt: '<div class="ask">' + a + ' × ' + b + ' = ?</div>',
                 options: numOptions(a * b), ans: String(a * b) };
      }
    },
    {
      id: 'mul-apply', unit: '3 表内乘法', icon: '📝', name: '用乘法解决实际问题',
      desc: '每份数 × 份数',
      gen() {
        const p = ri(2, 9), g = ri(2, 9);
        const scene = pick([
          { item: '🍎', unit: '盘', text: '每盘' }, { item: '📚', unit: '摞', text: '每摞' },
          { item: '🐟', unit: '缸', text: '每缸' }, { item: '🍪', unit: '盒', text: '每盒' }
        ]);
        return {
          prompt: groupsHTML(Math.min(g, 5), Math.min(p, 6), scene.item) +
            '<div class="ask">' + scene.text + ' ' + p + ' 个，共 ' + g + ' ' + scene.unit +
            '<br>一共有多少个？</div>',
          options: numOptions(p * g), ans: String(p * g)
        };
      }
    },
    {
      id: 'mul-addsub', unit: '3 表内乘法', icon: '🧩', name: '乘加、乘减',
      desc: '先算乘法，再算加减（沪教特有）',
      gen() {
        const a = ri(2, 6), b = ri(2, 6), c = ri(1, 9);
        if (rnd(2) === 0) {
          const ans = a * b + c;
          return {
            prompt: groupsHTML(a, b, '🍎') +
              '<div class="ask">' + a + ' × ' + b + ' + ' + c + ' = ?<br>' +
              '<span class="hint">先算乘法，再加</span></div>',
            options: numOptions(ans), ans: String(ans)
          };
        }
        const base = a * b, c2 = ri(1, Math.max(1, base - 1)), ans = base - c2;
        return {
          prompt: groupsHTML(a, b, '🍎') +
            '<div class="ask">' + a + ' × ' + b + ' − ' + c2 + ' = ?<br>' +
            '<span class="hint">先算乘法，再减</span></div>',
          options: numOptions(ans), ans: String(ans)
        };
      }
    },

    /* ========== 4. 我的学校我的家 ========== */
    {
      id: 'direction', unit: '4 我的学校我的家', icon: '🧭', name: '认识方向',
      desc: '东、南、西、北',
      gen() {
        const QS = [
          { q: '太阳从哪个方向升起？', a: '东', o: ['西', '南', '北'] },
          { q: '太阳从哪个方向落下？', a: '西', o: ['东', '南', '北'] },
          { q: '地图上通常「上」表示哪个方向？', a: '北', o: ['南', '东', '西'] },
          { q: '面向北，你的背面是哪个方向？', a: '南', o: ['东', '西', '北'] },
          { q: '面向北，你的右手边是哪个方向？', a: '东', o: ['西', '南', '北'] },
          { q: '面向北，你的左手边是哪个方向？', a: '西', o: ['东', '南', '北'] },
          { q: '东和西是什么关系？', a: '相反的方向', o: ['相同的方向', '相邻方向', '没有关系'] }
        ];
        const it = pick(QS);
        return { prompt: compassHTML() + '<div class="ask">' + it.q + '</div>',
                 options: strOptions(it.a, it.o), ans: it.a };
      }
    },
    {
      id: 'route', unit: '4 我的学校我的家', icon: '🗺️', name: '路线图与位置',
      desc: '谁在谁的哪一边',
      gen() {
        const d = pick(['东', '南', '西', '北']);
        const opp = { 东: '西', 南: '北', 西: '东', 北: '南' }[d];
        const k = rnd(2);
        if (k === 0) {
          return {
            prompt: '<div class="ask">小明从家向东走 3 格到学校<br>学校在小明家的哪个方向？</div>',
            options: shuffle(['东', '南', '西', '北']), ans: '东'
          };
        }
        return {
          prompt: '<div class="ask">学校在小明家的' + d + '面<br>小明家在学校的哪个方向？</div>',
          options: shuffle(['东', '南', '西', '北']), ans: opp
        };
      }
    },
    {
      id: 'left-right', unit: '4 我的学校我的家', icon: '👐', name: '左右与相对位置',
      desc: '面对面时左右相反',
      gen() {
        const QS = [
          { q: '你和同学面对面站着，你举起右手，他看到的在你的哪一边？', a: '他的左边', o: ['他的右边', '他的前面', '同一个方向'] },
          { q: '你和同伴<b>并排朝同一个方向</b>站，你的左边就是同伴的哪一边？', a: '左边', o: ['右边', '前面', '后面'] },
          { q: '排队时你从左数第 3 个，从右数第 4 个，这排共有几人？', a: '6 人', o: ['7 人', '5 人', '8 人'] },
          { q: '和同伴面对面，你的左边对应同伴的？', a: '右边', o: ['左边', '前面', '后面'] }
        ];
        const it = pick(QS);
        return { prompt: '<div class="ask">' + it.q + '</div>',
                 options: strOptions(it.a, it.o), ans: it.a };
      }
    },

    /* ========== 5. 分类 ========== */
    {
      id: 'classify', unit: '5 分类', icon: '🗂️', name: '按不同标准分类',
      desc: '可以按颜色 / 种类分',
      gen() {
        const k = rnd(2);
        if (k === 0) {
          return {
            prompt: '<div class="items">🍎 🍌 🍎 🍌 🍎</div>' +
              '<div class="ask">这些水果按<b>种类</b>分，能分成哪两类？</div>' +
              '<div class="hint">题目已经把标准定成「种类」了</div>',
            options: shuffle(['苹果和香蕉', '红色和黄色', '大的和小的', '圆的和弯的']),
            ans: '苹果和香蕉'
          };
        }
        return {
          prompt: '<div class="items">🔴 🔵 🔴 🔵 🔵 🔴</div>' +
            '<div class="ask">这些圆片按颜色分，各有多少个？</div>',
          options: shuffle(['红 3 个、蓝 3 个', '红 4 个、蓝 2 个', '红 2 个、蓝 4 个', '都是 3 个']),
          ans: '红 3 个、蓝 3 个'
        };
      }
    },
    {
      id: 'stats-table', unit: '5 分类', icon: '📊', name: '整理数据与统计表',
      desc: '数一数，填统计表',
      gen() {
        const names = ['苹果', '香蕉', '橘子'];
        const emos = ['🍎', '🍌', '🍊'];
        const counts = [ri(2, 8), ri(2, 8), ri(2, 8)];
        let line = '';
        for (let i = 0; i < 3; i++) line += emos[i].repeat(counts[i]) + ' ';
        let rows = '';
        for (let i = 0; i < 3; i++) {
          rows += '<div class="trow"><span>' + emos[i] + ' ' + names[i] + '</span><span>?</span></div>';
        }
        const k = rnd(3);
        if (k < 2) {
          const idx = k;
          return {
            prompt: '<div class="items small">' + line + '</div>' +
              '<div class="table">' + rows + '</div>' +
              '<div class="ask">' + names[idx] + ' 有多少个？</div>',
            options: numOptions(counts[idx]), ans: String(counts[idx])
          };
        }
        const total = counts[0] + counts[1] + counts[2];
        return {
          prompt: '<div class="items small">' + line + '</div>' +
            '<div class="table">' + rows + '</div>' +
            '<div class="ask">三种水果一共有多少个？</div>',
          options: numOptions(total), ans: String(total)
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
      id: 'combo', unit: '6 数学广场', icon: '🎨', name: '搭配问题',
      desc: '2 件上衣配 3 条裤子，几种搭法',
      gen() {
        const tops = ri(2, 4), bottoms = ri(2, 4);
        const ans = tops * bottoms;
        return {
          prompt: '<div class="items">👕 × ' + tops + '　👖 × ' + bottoms + '</div>' +
            '<div class="ask">' + tops + ' 件上衣和 ' + bottoms + ' 条裤子<br>' +
            '一共有多少种不同的搭配？</div>',
          options: numOptions(ans), ans: String(ans)
        };
      }
    },
    {
      id: 'reasoning', unit: '6 数学广场', icon: '🧠', name: '简单推理',
      desc: '根据条件推出结论',
      gen() {
        const QS = [
          { q: '小明比小红高，小红比小刚高。<br>谁最高？', a: '小明', o: ['小红', '小刚', '一样高'] },
          { q: '小明比小红高，小红比小刚高。<br>谁最矮？', a: '小刚', o: ['小明', '小红', '一样高'] },
          { q: '小丽、小刚和小美三人赛跑。<br>小丽不是第一，小刚是第二。<br>谁跑第一？', a: '小美', o: ['小丽', '小刚', '无法确定'] },
          { q: '小丽、小刚和小美三人赛跑。<br>小美是第一名，小刚是第二名。<br>谁跑最后？', a: '小丽', o: ['小美', '小刚', '无法确定'] },
          { q: '甲比乙大，乙比丙大。<br>谁最小？', a: '丙', o: ['甲', '乙', '一样大'] },
          { q: '红球比黄球多，黄球比蓝球多。<br>哪种球最少？', a: '蓝球', o: ['红球', '黄球', '一样多'] }
        ];
        const it = pick(QS);
        return { prompt: '<div class="ask">' + it.q + '</div>',
                 options: strOptions(it.a, it.o), ans: it.a };
      }
    }
  ];

  /* ================= 存储 ================= */
  const KEY = 'mathplay.g2.v2';   // v2：知识点按沪教五四学制图谱重排
  let DB = { stars: 0, answered: 0, correct: 0, days: {}, modes: {} };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
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
    // 拖拽型玩法一次操作量大，轮次短一些（默认 10 题）
    cur = { mode: m, idx: 0, total: m.round || ROUND, q: null, stars: 0, correct: 0, combo: 0, locked: false };
    audio();
    show('#view-quiz');
    nextQuestion();
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
  function renderHome() {
    const box = $('#unitList');
    box.innerHTML = '';
    const units = [];
    MODES.forEach((m) => { if (units.indexOf(m.unit) < 0) units.push(m.unit); });
    units.forEach((u) => {
      const list = MODES.filter((m) => m.unit === u);
      const block = document.createElement('div');
      block.className = 'unit-block card';
      const sp = u.indexOf(' ');
      block.innerHTML = '<div class="unit-title"><span class="u-badge">' + u.slice(0, sp) +
        '</span><span>' + u.slice(sp + 1) + '</span></div>';
      list.forEach((m) => {
        const b = document.createElement('button');
        b.className = 'mode-btn';
        const st = DB.modes[m.id];
        const acc = st && st.answered ? ' · 正确率 ' + Math.round(st.correct / st.answered * 100) + '%' : '';
        b.innerHTML = '<span class="m-emoji">' + m.icon + '</span>' +
          '<span class="m-meta"><span>' + m.name + '</span>' +
          '<span class="m-desc">' + m.desc + acc + '</span></span>';
        b.addEventListener('click', () => startRound(m.id));
        block.appendChild(b);
      });
      box.appendChild(block);
    });
    $('#homeStars').textContent = DB.stars;
    $('#homeDays').textContent = Object.keys(DB.days).length;
    $('#homeAcc').textContent = DB.answered ? Math.round(DB.correct / DB.answered * 100) + '%' : '—';
    show('#view-home');
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
  $('#btnQuit').addEventListener('click', renderHome);
  $('#btnAgain').addEventListener('click', () => startRound(cur ? cur.mode.id : MODES[0].id));
  $('#btnBackHome').addEventListener('click', renderHome);
  $('#btnParent').addEventListener('click', renderParent);
  $('#btnParentBack').addEventListener('click', renderHome);
  $('#btnReset').addEventListener('click', () => {
    if (confirm('确定清空全部练习记录？')) {
      DB = { stars: 0, answered: 0, correct: 0, days: {}, modes: {} };
      save(); renderParent();
    }
  });

  /* ================= 启动 ================= */
  // 供 drag.js 调用音效
  window.Sfx = { ok: sfxOk, bad: sfxBad, win: sfxWin, combo: sfxCombo };
  load();
  renderHome();
})();
