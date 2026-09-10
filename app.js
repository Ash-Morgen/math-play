/* 数学岛 — 数感训练（自用版）
   设计依据：新加坡 CPA 教学法（具象 Concrete → 形象 Pictorial → 抽象 Abstract）
   一轮 10 题，题 1-3 具象 / 4-6 形象 / 7-10 抽象，难度自动递进。 */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);

  /* ================= 工具 ================= */
  const rnd = (n) => Math.floor(Math.random() * n);
  const ri = (a, b) => a + rnd(b - a + 1);
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

  /* ================= 音效（Web Audio，零素材） ================= */
  let actx = null;
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, delay, dur, type, gain) {
    const ctx = audio();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain || 0.10, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.15));
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + (dur || 0.15) + 0.05);
  }
  const sfxOk = () => [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.065, 0.16, 'sine', 0.10));
  const sfxBad = () => { tone(196, 0, 0.18, 'triangle', 0.09); tone(147, 0.13, 0.24, 'triangle', 0.09); };
  const sfxCombo = () => [784, 988, 1175].forEach((f, i) => tone(f, i * 0.05, 0.12, 'square', 0.05));
  const sfxWin = () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.26, 'sine', 0.11));

  /* ================= 知识点（难度档） ================= */
  const LEVELS = [
    {
      id: 1, emoji: '🍎', name: '10 以内加法', desc: '数一数，合起来是几',
      gen() { const a = ri(1, 9), b = ri(1, 10 - a); return { a: a, b: b, op: '+', ans: a + b }; }
    },
    {
      id: 2, emoji: '🎈', name: '20 以内加减', desc: '进位加法 · 退位减法',
      gen() {
        if (rnd(2) === 0) { const a = ri(2, 9), b = ri(2, Math.min(9, 20 - a)); return { a: a, b: b, op: '+', ans: a + b }; }
        const a = ri(11, 20), b = ri(2, 9); return { a: a, b: b, op: '-', ans: a - b };
      }
    },
    {
      id: 3, emoji: '⭐', name: '100 以内加减', desc: '整十数与两位数',
      gen() {
        const m = rnd(3);
        if (m === 0) { const a = ri(2, 8) * 10, b = ri(1, 9) * 10; return { a: a, b: b, op: '+', ans: a + b }; }
        if (m === 1) { const a = ri(2, 9) * 10, b = ri(1, 9) * 10; return { a: a, b: b, op: '-', ans: a - b }; }
        const a = ri(2, 6) * 10 + ri(1, 9), b = ri(1, 3) * 10; return { a: a, b: b, op: '+', ans: a + b };
      }
    }
  ];

  /* ================= 存储 ================= */
  const KEY = 'mathplay.v1';
  let DB = { stars: 0, answered: 0, correct: 0, level: 1, days: {} };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) DB = Object.assign(DB, JSON.parse(raw));
    } catch (e) { /* 首次运行或存储被禁 */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { }
  }
  function recordDay(correct, stars) {
    const k = todayKey();
    const d = DB.days[k] || (DB.days[k] = { answered: 0, correct: 0, stars: 0 });
    d.answered++; if (correct) d.correct++; d.stars += stars;
    DB.answered++; if (correct) DB.correct++; DB.stars += stars;
  }

  /* ================= 题目呈现 ================= */
  const OBJ_A = '🍎', OBJ_B = '🎈';
  function objectsHTML(n, emoji) {
    if (n <= 0) return '';
    if (n <= 20) return '<div class="objects big">' + emoji.repeat(n) + '</div>';
    const tens = Math.floor(n / 10), ones = n % 10;
    return '<div class="objects">' + '🟦'.repeat(tens) + '🟨'.repeat(ones) + '</div>';
  }
  function dotsHTML(n, cls, offFrom) {
    let h = '';
    for (let i = 0; i < n; i++) {
      const off = (offFrom !== undefined && i >= offFrom) ? ' off' : '';
      h += '<span class="dot ' + (cls || '') + off + '"></span>';
    }
    return '<div class="dots">' + h + '</div>';
  }

  function renderConcrete(q) {
    if (q.op === '+') {
      return '<div class="obj-row">' + objectsHTML(q.a, OBJ_A) +
        '<span class="op-sign">+</span>' + objectsHTML(q.b, OBJ_B) + '</div>' +
        (q.a > 20 || q.b > 20 ? '<div style="font-size:12px;color:#627d98">🟦=10　🟨=1</div>' : '');
    }
    // 减法：整体 a 个，其中最后 b 个划掉
    if (q.a <= 20) {
      return '<div class="obj-row">' + objectsHTML(q.a - q.b, OBJ_A) +
        '<span class="objects big gone" style="text-decoration:line-through">' + OBJ_A.repeat(q.b) + '</span></div>';
    }
    return '<div class="obj-row">' + objectsHTML(q.a - q.b, OBJ_A) +
      '<span class="op-sign">－</span>' + objectsHTML(q.b, OBJ_B) + '</div>' +
      '<div style="font-size:12px;color:#627d98">🟦=10　🟨=1</div>';
  }
  function renderPictorial(q) {
    const eq = '<div class="eq-line">' + q.a + ' ' + (q.op === '+' ? '+' : '−') + ' ' + q.b +
      ' = <span class="blank">?</span></div>';
    if (q.op === '+') {
      return '<div class="obj-row">' + dotsHTML(q.a, '') +
        '<span class="op-sign">+</span>' + dotsHTML(q.b, 'b') + '</div>' + eq;
    }
    return '<div class="obj-row">' + dotsHTML(q.a, '', q.a - q.b) + '</div>' +
      '<div style="font-size:13px;color:#627d98">灰色 = 拿走</div>' + eq;
  }
  function renderAbstract(q) {
    return q.a + ' ' + (q.op === '+' ? '+' : '−') + ' ' + q.b + ' = <span class="blank">?</span>';
  }

  /* ================= 选项生成 ================= */
  function makeOptions(ans) {
    const set = new Set([ans]);
    const pool = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + 5, ans - 5]);
    for (let i = 0; i < pool.length && set.size < 4; i++) {
      const v = pool[i];
      if (v >= 0 && v !== ans) set.add(v);
    }
    let guard = 0;
    while (set.size < 4 && guard++ < 50) set.add(ri(0, Math.max(6, ans + 6)));
    return shuffle(Array.from(set));
  }

  /* ================= 状态机 ================= */
  const ROUND = 10;
  let cur = null;

  function show(viewId) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    $(viewId).classList.add('active');
  }

  function cpaFor(idx) { return idx < 3 ? 'C' : idx < 6 ? 'P' : 'A'; }
  const STAGE_LABEL = { C: '① 数一数', P: '② 看图想一想', A: '③ 直接算' };

  function startRound(levelId) {
    const lv = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    DB.level = lv.id;
    save();
    cur = { level: lv, idx: 0, q: null, stars: 0, correct: 0, combo: 0, locked: false };
    audio(); // 用户交互后解锁音频
    show('#view-quiz');
    nextQuestion();
  }

  function nextQuestion() {
    if (cur.idx >= ROUND) return finishRound();
    const raw = cur.level.gen();
    raw.idx = cur.idx;
    raw.cpa = cpaFor(cur.idx);
    raw.options = makeOptions(raw.ans);
    cur.q = raw;
    renderQuestion();
  }

  function renderQuestion() {
    const q = cur.q;
    cur.locked = false;
    $('#stageTag').textContent = STAGE_LABEL[q.cpa];
    $('#progress').style.width = (cur.idx / ROUND * 100) + '%';
    $('#quizStars').textContent = cur.stars;
    $('#feedback').textContent = '';
    $('#feedback').className = 'feedback';

    const box = $('#question');
    if (q.cpa === 'C') box.innerHTML = renderConcrete(q);
    else if (q.cpa === 'P') box.innerHTML = renderPictorial(q);
    else box.innerHTML = renderAbstract(q);

    const wrap = $('#answers');
    wrap.innerHTML = '';
    q.options.forEach((v, i) => {
      const b = document.createElement('button');
      b.className = 'ans-btn';
      b.textContent = v;
      b.dataset.val = String(v);
      b.addEventListener('click', () => choose(v, b));
      wrap.appendChild(b);
    });
  }

  function choose(val, btn) {
    if (!cur || cur.locked) return;
    cur.locked = true;
    const q = cur.q;
    const ok = val === q.ans;
    document.querySelectorAll('.ans-btn').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.val) === q.ans) b.classList.add('correct');
    });

    if (ok) {
      cur.stars++; cur.correct++; cur.combo++;
      btn.classList.add('correct');
      sfxOk();
      $('#feedback').className = 'feedback';
      $('#feedback').textContent = cur.combo >= 3 ? '连对 ' + cur.combo + ' 题！🔥' : '答对啦 👍';
      if (cur.combo >= 3) { sfxCombo(); popCombo(cur.combo); }
      recordDay(true, 1);
    } else {
      cur.combo = 0;
      btn.classList.add('wrong');
      sfxBad();
      $('#feedback').className = 'feedback bad';
      $('#feedback').textContent = '再想想，答案是 ' + q.ans;
      recordDay(false, 0);
    }
    save();
    $('#quizStars').textContent = cur.stars;

    const delay = ok ? (cur.combo >= 3 ? 900 : 700) : 1500;
    setTimeout(() => { cur.idx++; nextQuestion(); }, delay);
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
    $('#resultSub').textContent = '答对 ' + s + ' / ' + ROUND + ' 题　·　获得 ' + s + ' 颗星';
    show('#view-result');
  }

  /* ================= 首页 / 家长报告 ================= */
  function renderHome() {
    const list = $('#levelList');
    list.innerHTML = '';
    LEVELS.forEach((lv) => {
      const b = document.createElement('button');
      b.className = 'level-btn';
      b.innerHTML = '<span class="lv-emoji">' + lv.emoji + '</span>' +
        '<span class="lv-meta"><span>' + lv.name + '</span>' +
        '<span class="lv-desc">' + lv.desc + '</span></span>';
      b.addEventListener('click', () => startRound(lv.id));
      list.appendChild(b);
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
      '<div class="p-row"><span>练习天数</span><span>' + Object.keys(DB.days).length + ' 天</span></div>' +
      '<div class="p-row"><span>上次难度</span><span>' +
        ((LEVELS.find((l) => l.id === DB.level) || LEVELS[0]).name) + '</span></div>';

    const keys = Object.keys(DB.days).sort().reverse().slice(0, 7);
    if (!keys.length) {
      $('#parentDaily').innerHTML = '<div class="p-row"><span>还没有练习记录</span><span>—</span></div>';
    } else {
      $('#parentDaily').innerHTML = '<div class="card-title">最近 7 天</div>' + keys.map((k) => {
        const d = DB.days[k];
        const r = d.answered ? Math.round(d.correct / d.answered * 100) + '%' : '—';
        return '<div class="day-row"><span class="d">' + k + '</span><span>' +
          d.answered + ' 题 · 正确率 ' + r + ' · ⭐' + d.stars + '</span></div>';
      }).join('');
    }
    show('#view-parent');
  }

  /* ================= 键盘支持（电脑端） ================= */
  document.addEventListener('keydown', (e) => {
    if ($('#view-quiz').classList.contains('active')) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        const btns = document.querySelectorAll('.ans-btn');
        if (btns[n - 1] && !btns[n - 1].disabled) btns[n - 1].click();
      }
    } else if (e.key === 'Enter') {
      if ($('#view-result').classList.contains('active')) $('#btnAgain').click();
    }
  });

  /* ================= 事件绑定 ================= */
  $('#btnQuit').addEventListener('click', renderHome);
  $('#btnAgain').addEventListener('click', () => startRound(cur ? cur.level.id : DB.level));
  $('#btnBackHome').addEventListener('click', renderHome);
  $('#btnParent').addEventListener('click', renderParent);
  $('#btnParentBack').addEventListener('click', renderHome);
  $('#btnReset').addEventListener('click', () => {
    if (confirm('确定清空全部练习记录？')) {
      DB = { stars: 0, answered: 0, correct: 0, level: 1, days: {} };
      save(); renderParent();
    }
  });

  /* ================= 启动 ================= */
  load();
  renderHome();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }
})();
