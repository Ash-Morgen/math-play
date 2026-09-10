/* 二年级上 · 同步闯关（沪教版）
   按教材单元编排，每个模式对应教材中的一个知识点。
   设计原则：题目全部算法生成（非题库抄录），每题自带具象图形辅助理解。 */
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
    const pool = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans * 2, ans + 10, ans + 5]);
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
  const EMOJI = ['🍎', '🍊', '⭐', '🎈', '🐟', '🌸', '🍪', '🚗'];
  function groupsHTML(n, per, emoji) {
    let h = '';
    for (let i = 0; i < n; i++) h += '<div class="grp">' + emoji.repeat(per) + '</div>';
    return '<div class="groups">' + h + '</div>';
  }

  /* ================= 游戏模式（按沪教版二上单元） ================= */
  const MODES = [
    /* ---------- 一 复习与提高 ---------- */
    {
      id: 'boxes', unit: '一 复习与提高', icon: '🔲', name: '方框里填几', desc: '□ + 27 = 45',
      gen() {
        const x = ri(11, 60), b = ri(5, 35);
        if (rnd(2) === 0) {
          const c = x + b;
          return { prompt: '<div class="ask">□ + ' + b + ' = ' + c + '<br>方框里填几？</div>',
                   options: numOptions(x), ans: String(x) };
        }
        const c = x - b > 5 ? x - b : x + b;
        return { prompt: '<div class="ask">□ − ' + b + ' = ' + c + '<br>方框里填几？</div>',
                 options: numOptions(c + b), ans: String(c + b) };
      }
    },
    {
      id: 'clever', unit: '一 复习与提高', icon: '⚡', name: '巧算', desc: '凑整再加减',
      gen() {
        const tens = ri(2, 6) * 10, ones = ri(1, 8);
        if (rnd(2) === 0) {
          const a = tens + ones, b = ri(1, 4) * 10, ans = a + b;
          return {
            prompt: '<div class="ask">' + a + ' + ' + b + ' = ?<br>' +
                    '<span style="font-size:13px;color:#627d98">先加整十数，再加个位</span></div>',
            options: numOptions(ans), ans: String(ans)
          };
        }
        // 减法：保证十位有余量，结果不会退化成 1、2 这种琐碎答案
        const b = ri(1, 3) * 10, a = b + tens + ones, ans = tens + ones;
        return {
          prompt: '<div class="ask">' + a + ' − ' + b + ' = ?<br>' +
                  '<span style="font-size:13px;color:#627d98">先减整十数，个位不变</span></div>',
          options: numOptions(ans), ans: String(ans)
        };
      }
    },

    /* ---------- 二 乘法、除法（一） ---------- */
    {
      id: 'mul-meaning', unit: '二 乘法、除法（一）', icon: '✖️', name: '乘法的意义', desc: '几个几 → 乘法算式',
      gen() {
        const g = ri(2, 5), p = ri(2, 6), emoji = pick(EMOJI);
        const correct = g + ' × ' + p;
        return {
          prompt: groupsHTML(g, p, emoji) +
            '<div class="ask">有 ' + g + ' 份，每份 ' + p + ' 个<br>写成乘法算式是？</div>',
          options: strOptions(correct, [g + ' + ' + p, g + ' × ' + (p + 1), (g + 1) + ' × ' + p, g + ' + ' + p + ' + 1']),
          ans: correct
        };
      }
    },
    {
      id: 'mul-count', unit: '二 乘法、除法（一）', icon: '🔢', name: '一共多少个', desc: '几个几 → 算总数',
      gen() {
        const g = ri(2, 6), p = ri(2, 9), emoji = pick(EMOJI);
        return {
          prompt: groupsHTML(g, p, emoji) +
            '<div class="ask">有 ' + g + ' 份，每份 ' + p + ' 个<br>一共多少个？</div>',
          options: numOptions(g * p), ans: String(g * p)
        };
      }
    },
    {
      id: 'mul-248', unit: '二 乘法、除法（一）', icon: '🎯', name: '乘法口诀（2·4·8·5·10）', desc: '口诀求积',
      gen() {
        const a = pick([2, 4, 8, 5, 10]), b = ri(2, 9);
        return {
          prompt: '<div class="ask">' + a + ' × ' + b + ' = ?</div>',
          options: numOptions(a * b), ans: String(a * b)
        };
      }
    },
    {
      id: 'mul-rel-248', unit: '二 乘法、除法（一）', icon: '🔗', name: '2、4、8 的关系', desc: '8 就是 2 个 4',
      gen() {
        const b = ri(2, 9);
        // 教材本意：8 的乘法可以由 4 的乘法翻倍得到（8 = 2 个 4）
        if (rnd(2) === 0) {
          const ans = 8 * b;
          return {
            prompt: '<div class="ask">4 × ' + b + ' = ' + 4 * b + '<br>那么 8 × ' + b + ' = ?</div>' +
                    '<div style="font-size:13px;color:#627d98;text-align:center">8 是 4 的 2 倍，积也翻倍</div>',
            options: numOptions(ans), ans: String(ans)
          };
        }
        const ans = 4 * b;
        return {
          prompt: '<div class="ask">8 × ' + b + ' = ' + 8 * b + '<br>那么 4 × ' + b + ' = ?</div>' +
                  '<div style="font-size:13px;color:#627d98;text-align:center">8 的积是 4 的 2 倍，反过来就减半</div>',
          options: numOptions(ans), ans: String(ans)
        };
      }
    },
    {
      id: 'share', unit: '二 乘法、除法（一）', icon: '🍽️', name: '分一分与除法', desc: '平均分求每份',
      gen() {
        const per = ri(2, 6), g = ri(2, 5), total = per * g, emoji = pick(EMOJI);
        let plates = '';
        for (let i = 0; i < g; i++) plates += '<div class="plate">?</div>';
        return {
          prompt: '<div class="groups"><div class="grp">' + emoji.repeat(total) + '</div></div>' +
            '<div class="ask">把 ' + total + ' 个平均放进 ' + g + ' 个盘子<br>每个盘子放几个？</div>' +
            '<div class="plates">' + plates + '</div>',
          options: numOptions(per), ans: String(per)
        };
      }
    },
    {
      id: 'div-quot', unit: '二 乘法、除法（一）', icon: '➗', name: '用口诀求商', desc: '24 ÷ 6 = ?',
      gen() {
        const b = ri(2, 9), q = ri(2, 9), a = b * q;
        return {
          prompt: '<div class="ask">' + a + ' ÷ ' + b + ' = ?<br>' +
                  '<span style="font-size:13px;color:#627d98">想：' + b + ' 乘几等于 ' + a + '</span></div>',
          options: numOptions(q), ans: String(q)
        };
      }
    },
    {
      id: 'times-as-many', unit: '二 乘法、除法（一）', icon: '📊', name: '倍 / 几倍', desc: '蓝色是红色的几倍',
      gen() {
        const base = ri(2, 5), t = ri(2, 4);
        return {
          prompt: '<div class="rows">' +
            '<div class="row-line"><span class="tag">红</span>' + '🔴'.repeat(base) + '</div>' +
            '<div class="row-line"><span class="tag">蓝</span>' + '🔵'.repeat(base * t) + '</div></div>' +
            '<div class="ask">蓝色小球的个数是红色的几倍？</div>',
          options: numOptions(t), ans: String(t)
        };
      }
    },
    {
      id: 'div-zero', unit: '二 乘法、除法（一）', icon: '0️⃣', name: '被除数为 0', desc: '0 ÷ 5 = ?',
      gen() {
        const b = ri(2, 9);
        return {
          prompt: '<div class="ask">0 ÷ ' + b + ' = ?<br>' +
                  '<span style="font-size:13px;color:#627d98">0 个东西分给 ' + b + ' 个人</span></div>',
          options: shuffle(['0', '1', String(b), '分不了']), ans: '0'
        };
      }
    },

    /* ---------- 三 统计 ---------- */
    {
      id: 'chart', unit: '三 统计', icon: '📈', name: '条形统计图', desc: '读图回答问题',
      gen() {
        const items = ['苹果', '香蕉', '橘子', '草莓'];
        const emo = ['🍎', '🍌', '🍊', '🍓'];
        let data;
        // 四个数必须互不相同，否则「哪种最多/最少」会有两个并列答案
        do { data = items.map(() => ri(2, 9)); } while (new Set(data).size < 4);
        const mx = Math.max.apply(null, data);
        let bars = '';
        for (let i = 0; i < 4; i++) {
          const h = Math.round(data[i] / mx * 95) + 22;
          bars += '<div class="bar-wrap"><div class="bar" style="height:' + h + 'px">' + data[i] +
            '</div><div class="bar-lbl">' + items[i] + '</div></div>';
        }
        const chart = '<div class="chart">' + bars + '</div>';
        const k = pick(['most', 'least', 'sum']);
        let ask, opts, ans;
        if (k === 'most') {
          ask = '哪种水果最多？';
          ans = items[data.indexOf(mx)];
          opts = shuffle(items.slice());
        } else if (k === 'least') {
          const mn = Math.min.apply(null, data);
          ask = '哪种水果最少？';
          ans = items[data.indexOf(mn)];
          opts = shuffle(items.slice());
        } else {
          const s = data.reduce((x, y) => x + y, 0);
          ask = '四种水果一共有多少个？';
          ans = String(s);
          opts = numOptions(s);
        }
        return { prompt: chart + '<div class="ask">' + ask + '</div>', options: opts, ans: ans };
      }
    },

    /* ---------- 四 乘法、除法 ---------- */
    {
      id: 'mul-7369', unit: '四 乘法、除法', icon: '🎲', name: '乘法口诀（7·3·6·9）', desc: '口诀求积',
      gen() {
        const a = pick([7, 3, 6, 9]), b = ri(2, 9);
        return {
          prompt: '<div class="ask">' + a + ' × ' + b + ' = ?</div>',
          options: numOptions(a * b), ans: String(a * b)
        };
      }
    },
    {
      id: 'div-7369', unit: '四 乘法、除法', icon: '🔀', name: '7·3·6·9 的除法', desc: '口诀求商',
      gen() {
        const b = pick([7, 3, 6, 9]), q = ri(2, 9), a = b * q;
        return {
          prompt: '<div class="ask">' + a + ' ÷ ' + b + ' = ?<br>' +
                  '<span style="font-size:13px;color:#627d98">想：' + b + ' 乘几等于 ' + a + '</span></div>',
          options: numOptions(q), ans: String(q)
        };
      }
    },
    {
      id: 'div-rem', unit: '四 乘法、除法', icon: '🔘', name: '有余数的除法', desc: '25 ÷ 4 = 6 …… 1',
      gen() {
        const b = ri(2, 9), q = ri(2, 9), r = ri(1, b - 1), a = b * q + r;
        const correct = q + ' …… ' + r;
        return {
          prompt: '<div class="ask">' + a + ' ÷ ' + b + ' = ?<br>' +
                  '<span style="font-size:13px;color:#627d98">商几？余几？（余数要比除数小）</span></div>',
          options: strOptions(correct, [
            (q + 1) + ' …… ' + r, q + ' …… 0', (q + 1) + ' …… ' + (r > 1 ? r - 1 : 0)
          ]),
          ans: correct
        };
      }
    },
    {
      id: 'mul-split', unit: '四 乘法、除法', icon: '✂️', name: '分拆为乘与加', desc: '8×6 = 5×6 + □×6',
      gen() {
        const a = pick([6, 7, 8, 9]), b = ri(2, 9);
        const ans = a - 5;
        return {
          prompt: '<div class="ask">' + a + ' × ' + b + ' = 5 × ' + b + ' + □ × ' + b +
                  '<br>方框里填几？</div>',
          options: numOptions(ans), ans: String(ans)
        };
      }
    },

    /* ---------- 五 几何小实践 ---------- */
    {
      id: 'angle', unit: '五 几何小实践', icon: '📐', name: '角与直角', desc: '辨认锐角 / 直角 / 钝角',
      gen() {
        const t = pick(['acute', 'right', 'obtuse']);
        const deg = t === 'acute' ? ri(28, 68) : t === 'right' ? 90 : ri(112, 152);
        const rad = deg * Math.PI / 180, L = 92;
        const x1 = 32, y1 = 122;
        const x2 = x1 + L, y2 = y1;
        const x3 = x1 + L * Math.cos(rad), y3 = y1 - L * Math.sin(rad);
        const svg = '<svg class="angle" width="176" height="146" viewBox="0 0 176 146">' +
          '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#0ca678" stroke-width="5" stroke-linecap="round"/>' +
          '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x3.toFixed(1) + '" y2="' + y3.toFixed(1) + '" stroke="#0ca678" stroke-width="5" stroke-linecap="round"/>' +
          '<circle cx="' + x1 + '" cy="' + y1 + '" r="4.5" fill="#087f5b"/></svg>';
        const label = { acute: '锐角', right: '直角', obtuse: '钝角' }[t];
        return {
          prompt: svg + '<div class="ask">这个角是什么角？</div>',
          options: shuffle(['锐角', '直角', '钝角']), ans: label
        };
      }
    },
    {
      id: 'solid', unit: '五 几何小实践', icon: '🧊', name: '正方体与长方体', desc: '数面、数棱、认边',
      gen() {
        const QS = [
          { q: '正方体的 6 个面都是什么形状？', a: '正方形', o: ['长方形', '三角形', '圆'] },
          { q: '长方体有几个面？', a: '6 个', o: ['4 个', '8 个', '12 个'] },
          { q: '正方体有几条棱？', a: '12 条', o: ['6 条', '8 条', '10 条'] },
          { q: '正方体有几个顶点？', a: '8 个', o: ['4 个', '6 个', '12 个'] },
          { q: '正方形的 4 条边有什么关系？', a: '4 条边一样长', o: ['对边一样长', '都不相等', '邻边一样长'] },
          { q: '长方形有几个直角？', a: '4 个', o: ['1 个', '2 个', '3 个'] },
          { q: '长方形有几条边？', a: '4 条', o: ['3 条', '5 条', '6 条'] },
          { q: '正方体和长方体，哪个的 6 个面一样大？', a: '正方体', o: ['长方体', '两个都不是', '两个都是'] }
        ];
        const it = pick(QS);
        return { prompt: '<div class="ask">' + it.q + '</div>',
                 options: strOptions(it.a, it.o), ans: it.a };
      }
    },

    /* ---------- 六 整理与提高 ---------- */
    {
      id: 'mul-dist', unit: '六 整理与提高', icon: '🧩', name: '5个3加3个3等于几个3', desc: '乘法意义的合并',
      gen() {
        const base = ri(3, 7), a = ri(2, 4), b = ri(2, 4);
        const add = rnd(3) !== 0;
        const ans = add ? a + b : Math.abs(a - b) || 1;
        const expr = add
          ? a + ' 个 ' + base + ' 加 ' + b + ' 个 ' + base
          : Math.max(a, b) + ' 个 ' + base + ' 减 ' + Math.min(a, b) + ' 个 ' + base;
        return {
          prompt: '<div class="ask">' + expr + '<br>等于几个 ' + base + '？' +
                  '<br><span style="font-size:13px;color:#627d98">把两边的「个数」相加或相减</span></div>',
          options: numOptions(ans), ans: String(ans)
        };
      }
    },
    {
      id: 'mul-div-mix', unit: '六 整理与提高', icon: '🔁', name: '乘与除', desc: '乘除互逆',
      gen() {
        const b = ri(2, 9), q = ri(2, 9), a = b * q;
        const useMul = rnd(2) === 0;
        if (useMul) {
          return { prompt: '<div class="ask">' + b + ' × ' + q + ' = ?</div>',
                   options: numOptions(a), ans: String(a) };
        }
        return { prompt: '<div class="ask">' + a + ' ÷ ' + b + ' = ?<br>' +
                 '<span style="font-size:13px;color:#627d98">因为 ' + b + ' × ' + q + ' = ' + a + '</span></div>',
                 options: numOptions(q), ans: String(q) };
      }
    },
    {
      id: 'dot-pattern', unit: '六 整理与提高', icon: '🔵', name: '点图与数', desc: '数点找规律',
      gen() {
        const n = ri(2, 5);
        const total = n * n;
        let rows = '';
        for (let i = 0; i < n; i++) {
          let line = '';
          for (let j = 0; j < n; j++) line += '🔵';
          rows += '<div class="row-line">' + line + '</div>';
        }
        const k = pick(['total', 'side']);
        if (k === 'total') {
          return { prompt: '<div class="rows">' + rows + '</div>' +
                   '<div class="ask">正方形点阵一共有多少个点？</div>',
                   options: numOptions(total), ans: String(total) };
        }
        return { prompt: '<div class="rows">' + rows + '</div>' +
                 '<div class="ask">每边有几个点？</div>',
                 options: numOptions(n), ans: String(n) };
      }
    }
  ];

  /* ================= 存储 ================= */
  const KEY = 'mathplay.g2.v1';
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
    cur = { mode: m, idx: 0, q: null, stars: 0, correct: 0, combo: 0, locked: false };
    audio();
    show('#view-quiz');
    nextQuestion();
  }

  function nextQuestion() {
    if (cur.idx >= ROUND) return finishRound();
    const q = cur.mode.gen();
    // 兜底：保证 4 个选项且含正确答案
    const opts = q.options.slice();
    if (opts.indexOf(q.ans) < 0) opts.push(q.ans);
    q.options = shuffle(opts);
    cur.q = q;
    renderQuestion();
  }

  function renderQuestion() {
    const q = cur.q;
    cur.locked = false;
    $('#stageTag').textContent = cur.mode.name;
    $('#progress').style.width = (cur.idx / ROUND * 100) + '%';
    $('#quizStars').textContent = cur.stars;
    $('#feedback').textContent = '';
    $('#feedback').className = 'feedback';
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
    cur.locked = true;
    const q = cur.q;
    const ok = val === String(q.ans);
    document.querySelectorAll('.ans-btn').forEach((b) => {
      b.disabled = true;
      if (b.dataset.val === String(q.ans)) b.classList.add('correct');
    });
    if (ok) {
      cur.stars++; cur.correct++; cur.combo++;
      btn.classList.add('correct');
      sfxOk();
      $('#feedback').className = 'feedback';
      $('#feedback').textContent = cur.combo >= 3 ? '连对 ' + cur.combo + ' 题！🔥' : '答对啦 👍';
      if (cur.combo >= 3) { sfxCombo(); popCombo(cur.combo); }
      record(true, 1, cur.mode.id);
    } else {
      cur.combo = 0;
      btn.classList.add('wrong');
      sfxBad();
      $('#feedback').className = 'feedback bad';
      $('#feedback').textContent = '再看看，答案是 ' + q.ans;
      record(false, 0, cur.mode.id);
    }
    save();
    $('#quizStars').textContent = cur.stars;
    setTimeout(() => { cur.idx++; nextQuestion(); }, ok ? 720 : 1600);
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
    if (s === ROUND) { emoji = '🏆'; title = '满分！太厉害了'; stars = '⭐⭐⭐⭐⭐'; }
    else if (s >= 8) { emoji = '🎉'; title = '真棒！'; }
    else if (s >= 5) { emoji = '👍'; title = '不错哦！'; }
    if (s === ROUND) sfxWin(); else if (s >= 8) sfxOk();
    $('#resultEmoji').textContent = emoji;
    $('#resultTitle').textContent = title;
    $('#resultStars').textContent = stars;
    $('#resultSub').textContent = '「' + cur.mode.name + '」答对 ' + s + ' / ' + ROUND + ' 题　·　获得 ' + s + ' 颗星';
    show('#view-result');
  }

  /* ================= 首页（按单元分组） ================= */
  function renderHome() {
    const box = $('#unitList');
    box.innerHTML = '';
    const units = [];
    MODES.forEach((m) => { if (units.indexOf(m.unit) < 0) units.push(m.unit); });
    units.forEach((u) => {
      const list = MODES.filter((m) => m.unit === u);
      const block = document.createElement('div');
      block.className = 'unit-block card';
      let head = '<div class="unit-title"><span class="u-badge">' + u.split(' ')[0] +
        '</span><span>' + u.split(' ').slice(1).join(' ') + '</span></div>';
      block.innerHTML = head;
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

    // 分知识点强弱
    const rows = MODES.filter((m) => DB.modes[m.id] && DB.modes[m.id].answered >= 5)
      .map((m) => {
        const s = DB.modes[m.id];
        const r = Math.round(s.correct / s.answered * 100);
        return { name: m.name, r: r, n: s.answered };
      }).sort((a, b) => a.r - b.r);
    $('#parentModes').innerHTML = '<div class="card-title">知识点掌握（至少 5 题）</div>' +
      (rows.length ? rows.map((x) => '<div class="day-row"><span class="d">' + x.name +
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
  load();
  renderHome();
})();
