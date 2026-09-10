/* 乘法消除玩法（借鉴 math-game-2a 的消除设计，按本项目框架重写）
   玩法：棋盘上点选 3 块，若能组成「因数 × 因数 = 积」即消除：
        消除这 3 块 + 按积的十位数随机追加消除（12 → 多消 1 块，6 → 不追加）
   过关：限时内达到目标分。星级 1 星=达标 / 2 星=1.35 倍 / 3 星=1.7 倍。
*/
(function () {
  'use strict';
  const Sfx = () => window.Sfx || { ok: function () { }, bad: function () { }, win: function () { } };
  const EMPTY = 0;
  const MAX_RANDOM_CLEAR = 12;   // 追加消除上限，防瞬间清盘

  const COLORS = ['#FF6B6B', '#4ECDC4', '#FFB84D', '#6BCB77', '#4D96FF', '#A66CFF', '#F2789F', '#20C997'];

  /* ================= 纯逻辑 ================= */

  // 自洽值集：因数本身 + 它们与 2~9 的积（保证棋盘上大量可组组合）
  function buildValueSet(lo, hi, maxVal) {
    // 只放「自洽」的数：因数本身 + 两个因数都在范围内的积。
    // 反例：7~9 关若放入 14 却没有因数 2，这块永远凑不出、只会堆积成死块。
    const s = new Set();
    for (let a = lo; a <= hi; a++) s.add(a);
    for (let a = lo; a <= hi; a++) {
      for (let b = lo; b <= hi; b++) {
        const c = a * b;
        if (c <= maxVal) s.add(c);
      }
    }
    return Array.from(s).sort(function (x, y) { return x - y; });
  }

  // 三块能否组成 因数×因数=积（任取两数为因数）
  function evaluateTriple(nums) {
    const x = nums[0], y = nums[1], z = nums[2];
    if (x * y === z && x > 1 && y > 1) return { a: x, b: y, c: z };
    if (x * z === y && x > 1 && z > 1) return { a: x, b: z, c: y };
    if (y * z === x && y > 1 && z > 1) return { a: y, b: z, c: x };
    return null;
  }

  // 追加消除数 = 积的十位数
  function modClear(n) { const t = Math.floor(n / 10); return t > 0 ? t : 0; }

  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function makeGrid(rows, cols, vs) {
    const g = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(pick(vs));
      g.push(row);
    }
    return g;
  }

  // 找一组可消的三块（字典加速）；返回 [{r,c,v}×3] 或 null
  function findTriple(grid, rows, cols, vs) {
    const byVal = new Map();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[r][c];
        if (v === EMPTY) continue;
        if (!byVal.has(v)) byVal.set(v, []);
        byVal.get(v).push({ r: r, c: c, v: v });
      }
    }
    const vals = Array.from(byVal.keys());
    for (let i = 0; i < vals.length; i++) {
      for (let j = i; j < vals.length; j++) {
        const x = vals[i], y = vals[j];
        const z = x * y;
        if (z <= vs[vs.length - 1] * 9 + 99 && x > 1 && y > 1 && byVal.has(z) && z !== x && z !== y) {
          // x,y,z 三个值可能重复（如 2,2,4）→ 需要不同格子
          const cx = byVal.get(x), cy = byVal.get(y), cz = byVal.get(z);
          let A, B, C;
          if (x === y) { if (cx.length < 2) continue; A = cx[0]; B = cx[1]; }
          else { A = cx[0]; B = cy[0]; }
          C = cz[0];
          const ids = [A.r + ',' + A.c, B.r + ',' + B.c, C.r + ',' + C.c];
          if (new Set(ids).size !== 3) continue;
          return [A, B, C];
        }
      }
    }
    return null;
  }

  // 重力下落补块，返回新生成的格子坐标（供播动画）
  function refill(grid, rows, cols, vs) {
    const fresh = [];
    for (let c = 0; c < cols; c++) {
      const stack = [];
      for (let r = rows - 1; r >= 0; r--) if (grid[r][c] !== EMPTY) stack.push(grid[r][c]);
      for (let r = rows - 1; r >= 0; r--) {
        if (stack.length) grid[r][c] = stack.shift();
        else { grid[r][c] = pick(vs); fresh.push(r + ',' + c); }
      }
    }
    return fresh;
  }

  function starOf(score, target) {
    if (score >= Math.round(target * 1.7)) return 3;
    if (score >= Math.round(target * 1.35)) return 2;
    if (score >= target) return 1;
    return 0;
  }

  /* ================= UI ================= */

  function mount(root, cfg, onFinish) {
    const rows = cfg.rows || 7, cols = cfg.cols || 6;
    const timeSec = cfg.timeSec || 120;
    const target = cfg.targetScore || 120;
    const vs = buildValueSet(cfg.factorRange[0], cfg.factorRange[1], cfg.maxVal || 81);

    let grid = makeGrid(rows, cols, vs);
    let guard = 0;
    while (!findTriple(grid, rows, cols, vs) && guard++ < 60) grid = makeGrid(rows, cols, vs);

    let score = 0, matched = 0, sel = [], timeLeft = timeSec, over = false, locked = false;
    let timer = null;

    const wrap = document.createElement('div');
    wrap.className = 'mg-wrap';
    wrap.innerHTML =
      '<div class="mg-bar">' +
      '<span class="mg-score">分数 <b>0</b></span>' +
      '<span class="mg-target">目标 ' + target + '</span>' +
      '<span class="mg-time">⏱ <b>' + timeSec + '</b>s</span>' +
      '</div>' +
      '<div class="mg-formula"></div>' +
      '<div class="mg-board" style="grid-template-columns:repeat(' + cols + ',1fr)"></div>' +
      '<div class="mg-actions">' +
      '<button class="mg-hint">💡 提示</button>' +
      '<button class="mg-quit">结束本局</button>' +
      '</div>';
    root.appendChild(wrap);

    const boardEl = wrap.querySelector('.mg-board');
    const scoreEl = wrap.querySelector('.mg-score b');
    const timeEl = wrap.querySelector('.mg-time b');
    const formEl = wrap.querySelector('.mg-formula');
    const cellEls = [];

    function buildDom() {
      boardEl.innerHTML = '';
      cellEls.length = 0;
      for (let r = 0; r < rows; r++) {
        cellEls[r] = [];
        for (let c = 0; c < cols; c++) {
          const d = document.createElement('button');
          d.className = 'mg-cell';
          d.dataset.r = r; d.dataset.c = c;
          d.addEventListener('click', function () { tap(r, c); });
          boardEl.appendChild(d);
          cellEls[r][c] = d;
        }
      }
    }

    function paint() {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = cellEls[r][c], v = grid[r][c];
          d.textContent = v === EMPTY ? '' : v;
          d.className = 'mg-cell' + (v === EMPTY ? ' empty' : '') +
            (sel.some(function (s) { return s.r === r && s.c === c; }) ? ' sel' : '');
          if (v !== EMPTY) d.style.setProperty('--c', COLORS[v % COLORS.length]);
        }
      }
      scoreEl.textContent = score;
      timeEl.textContent = timeLeft;
      updateFormula();
    }

    function updateFormula() {
      if (sel.length === 0) { formEl.textContent = '点选 3 块，凑出「×」算式'; formEl.className = 'mg-formula'; return; }
      const nums = sel.map(function (s) { return grid[s.r][s.c]; });
      formEl.textContent = nums.join(' , ') + (sel.length < 3 ? '  再选 ' + (3 - sel.length) + ' 块' : '');
      formEl.className = 'mg-formula' + (sel.length === 3 ? ' full' : '');
    }

    function tap(r, c) {
      if (over || locked || grid[r][c] === EMPTY) return;
      const idx = sel.findIndex(function (s) { return s.r === r && s.c === c; });
      if (idx >= 0) { sel.splice(idx, 1); paint(); return; }
      if (sel.length >= 3) sel.shift();
      sel.push({ r: r, c: c });
      Sfx().tick && Sfx().tick();
      paint();
      if (sel.length === 3) setTimeout(resolve, 180);
    }

    function resolve() {
      if (over) return;
      const nums = sel.map(function (s) { return grid[s.r][s.c]; });
      const res = evaluateTriple(nums);
      if (!res) {
        // 不成算式：抖动并清空选择
        locked = true;
        sel.forEach(function (s) { cellEls[s.r][s.c].classList.add('bad'); });
        Sfx().bad();
        setTimeout(function () {
          sel.forEach(function (s) { cellEls[s.r][s.c].classList.remove('bad'); });
          sel = []; locked = false; paint();
        }, 420);
        return;
      }
      // 成立：得分 + 消除
      locked = true;
      const gain = res.c;
      score += gain;
      matched++;
      Sfx().ok();
      formEl.textContent = res.a + ' × ' + res.b + ' = ' + res.c + '　+' + gain + ' 分';
      formEl.className = 'mg-formula hit';

      const cleared = sel.map(function (s) { return { r: s.r, c: s.c }; });
      const extra = Math.min(modClear(res.c), MAX_RANDOM_CLEAR);
      if (extra > 0) {
        const pool = [];
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++)
            if (grid[r][c] !== EMPTY && !cleared.some(function (x) { return x.r === r && x.c === c; }))
              pool.push({ r: r, c: c });
        shuffle(pool);
        pool.slice(0, extra).forEach(function (p) { cleared.push(p); });
      }
      cleared.forEach(function (p) { cellEls[p.r][p.c].classList.add('clear'); });
      scoreEl.textContent = score;
      sel = [];

      setTimeout(function () {
        cleared.forEach(function (p) { grid[p.r][p.c] = EMPTY; });
        const fresh = refill(grid, rows, cols, vs);
        paint();
        fresh.forEach(function (k) {
          const pr = k.split(',');
          const d = cellEls[Number(pr[0])][Number(pr[1])];
          d.classList.add('drop');
          setTimeout(function () { d.classList.remove('drop'); }, 320);
        });
        // 死局兜底：无解则重排
        let g2 = 0;
        while (!findTriple(grid, rows, cols, vs) && g2++ < 40) {
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = pick(vs);
        }
        if (g2 > 0) {
          paint();
          formEl.textContent = '没有可凑的算式了，已重新排列 🔄';
          formEl.className = 'mg-formula warn';
        }
        locked = false;
      }, 340);
    }

    function hint() {
      if (over || locked) return;
      const t = findTriple(grid, rows, cols, vs);
      if (!t) return;
      sel = t.map(function (x) { return { r: x.r, c: x.c }; });
      paint();
      t.forEach(function (x) { cellEls[x.r][x.c].classList.add('hint'); });
      // 提示即帮玩家选中这三块，稍后自动判定 —— 让孩子看清"原来这三块能凑"
      setTimeout(function () {
        t.forEach(function (x) { cellEls[x.r][x.c].classList.remove('hint'); });
      }, 900);
      setTimeout(resolve, 1000);
    }

    function finish() {
      if (over) return;
      over = true;
      if (timer) clearInterval(timer);
      const stars = starOf(score, target);
      if (stars > 0) Sfx().win(); else Sfx().bad();
      onFinish({ score: score, stars: stars, matched: matched });
    }

    wrap.querySelector('.mg-hint').addEventListener('click', hint);
    wrap.querySelector('.mg-quit').addEventListener('click', finish);

    timer = setInterval(function () {
      if (over) return;
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 10) timeEl.parentNode.classList.add('urgent');
      if (timeLeft <= 0) finish();
    }, 1000);

    buildDom();
    paint();
    window.__mgActive = function () { if (timer) clearInterval(timer); };
  }

  window.MatchEngine = { mount: mount, _logic: { evaluateTriple: evaluateTriple, buildValueSet: buildValueSet, modClear: modClear, findTriple: findTriple, makeGrid: makeGrid } };
})();
