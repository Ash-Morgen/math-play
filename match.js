/* 乘法消除（升级版 · 最终版）
   玩法：棋盘上点选 3 块，能组成「因数 × 因数 = 积」即消除：
        消除这 3 块 + 按积的十位数追加消除（24 → 多消 2 块）
   关卡：三关递进 —— 2~6 口诀 → 7~9 口诀 → 全口诀挑战，每关独立目标分
   反馈：碎裂 → 宝石飞出 → 计分板弹跳 → 飘字 → 追加越多光晕越强

   cfg = {
     rows, cols,
     levels: [{ name, factorRange:[lo,hi], maxVal, timeSec, targetScore }, ...]
   }
   onFinish({ score, stars, matched, passed })
*/
(function () {
  'use strict';
  var Sfx = function () { return window.Sfx || {}; };
  function beep(k) { var s = Sfx(); if (typeof s[k] === 'function') { try { s[k](); } catch (e) { } } }

  var EMPTY = 0;
  var MAX_RANDOM_CLEAR = 12;
  var COLORS = ['#FF6B6B', '#4ECDC4', '#FFB84D', '#6BCB77', '#4D96FF', '#A66CFF', '#F2789F', '#20C997'];

  /* ================= 纯逻辑 ================= */

  // 自洽值集：因数本身 + 它们彼此（范围内）的积，保证不会有永远消不掉的死块
  function buildValueSet(lo, hi, maxVal) {
    var s = new Set();
    for (var a = lo; a <= hi; a++) s.add(a);
    for (var i = lo; i <= hi; i++) {
      for (var j = lo; j <= hi; j++) {
        var c = i * j;
        if (c <= maxVal) s.add(c);
      }
    }
    return Array.from(s).sort(function (x, y) { return x - y; });
  }

  function evaluateTriple(nums) {
    var x = nums[0], y = nums[1], z = nums[2];
    if (x * y === z && x > 1 && y > 1) return { a: x, b: y, c: z };
    if (x * z === y && x > 1 && z > 1) return { a: x, b: z, c: y };
    if (y * z === x && y > 1 && z > 1) return { a: y, b: z, c: x };
    return null;
  }

  function modClear(n) { var t = Math.floor(n / 10); return t > 0 ? t : 0; }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function makeGrid(rows, cols, vs) {
    var g = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push(pick(vs));
      g.push(row);
    }
    return g;
  }

  function findTriple(grid, rows, cols, vs) {
    var byVal = new Map();
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var v = grid[r][c];
        if (v === EMPTY) continue;
        if (!byVal.has(v)) byVal.set(v, []);
        byVal.get(v).push({ r: r, c: c, v: v });
      }
    }
    var vals = Array.from(byVal.keys());
    var maxC = vs[vs.length - 1];
    for (var i = 0; i < vals.length; i++) {
      for (var j = i; j < vals.length; j++) {
        var x = vals[i], y = vals[j];
        var z = x * y;
        if (x > 1 && y > 1 && byVal.has(z) && z !== x && z !== y) {
          var cx = byVal.get(x), cy = byVal.get(y), cz = byVal.get(z);
          var A, B, C;
          if (x === y) { if (cx.length < 2) continue; A = cx[0]; B = cx[1]; }
          else { A = cx[0]; B = cy[0]; }
          C = cz[0];
          var ids = [A.r + ',' + A.c, B.r + ',' + B.c, C.r + ',' + C.c];
          if (new Set(ids).size !== 3) continue;
          return [A, B, C];
        }
      }
    }
    return null;
  }

  function refill(grid, rows, cols, vs) {
    var fresh = [];
    for (var c = 0; c < cols; c++) {
      var stack = [];
      for (var r = rows - 1; r >= 0; r--) if (grid[r][c] !== EMPTY) stack.push(grid[r][c]);
      for (var r2 = rows - 1; r2 >= 0; r2--) {
        if (stack.length) grid[r2][c] = stack.shift();
        else { grid[r2][c] = pick(vs); fresh.push(r2 + ',' + c); }
      }
    }
    return fresh;
  }

  /* ================= UI ================= */

  function mount(root, cfg, onFinish) {
    var rows = cfg.rows || 8, cols = cfg.cols || 6;
    var LEVELS = cfg.levels && cfg.levels.length
      ? cfg.levels
      : [{ name: '挑战', factorRange: cfg.factorRange || [2, 9], maxVal: cfg.maxVal || 81, timeSec: cfg.timeSec || 120, targetScore: cfg.targetScore || 120 }];

    var lv = 0, passed = 0;
    var vs = [], target = 0, timeSec = 0, timeLeft = 0;
    var grid = [], score = 0, matched = 0, sel = [], over = false, locked = false, busy = false;
    var timer = null, levelScore = 0;

    var wrap = document.createElement('div');
    wrap.className = 'mg-wrap';
    wrap.innerHTML =
      '<div class="mg-bar">' +
        '<span class="mg-score">分数 <b>0</b></span>' +
        '<span class="mg-lv"></span>' +
        '<span class="mg-time">\u23F1 <b>0</b>s</span>' +
      '</div>' +
      '<div class="mg-formula"></div>' +
      '<div class="mg-board"></div>' +
      '<div class="mg-actions">' +
        '<button class="mg-hint">\uD83D\uDCA1 提示</button>' +
        '<button class="mg-quit">\u7ED3\u675F\u672C\u5C40</button>' +
      '</div>';
    root.appendChild(wrap);

    var boardEl = wrap.querySelector('.mg-board');
    var scoreEl = wrap.querySelector('.mg-score b');
    var scoreBox = wrap.querySelector('.mg-score');
    var lvEl = wrap.querySelector('.mg-lv');
    var timeEl = wrap.querySelector('.mg-time b');
    var timeBox = wrap.querySelector('.mg-time');
    var formEl = wrap.querySelector('.mg-formula');
    var cellEls = [];
    var freshCells = {};

    boardEl.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';

    /* ---------- 动画辅助（与宝石矿工同一套） ---------- */
    function bump(elm) {
      if (!elm) return;
      elm.classList.remove('bump');
      void elm.offsetWidth;
      elm.classList.add('bump');
      setTimeout(function () { elm.classList.remove('bump'); }, 470);
    }
    function flyGem(fromEl, toEl) {
      if (!fromEl || !toEl) return;
      var r1 = fromEl.getBoundingClientRect(), r2 = toEl.getBoundingClientRect();
      var g = document.createElement('div');
      g.className = 'mine-gemfly';
      g.textContent = '\uD83D\uDC8E';
      g.style.left = (r1.left + r1.width / 2) + 'px';
      g.style.top = (r1.top + r1.height / 2) + 'px';
      document.body.appendChild(g);
      requestAnimationFrame(function () {
        g.style.transform = 'translate(-50%,-50%) translate(' +
          (r2.left + r2.width / 2 - r1.left - r1.width / 2) + 'px,' +
          (r2.top + r2.height / 2 - r1.top - r1.height / 2) + 'px) scale(.55)';
        g.style.opacity = '0';
      });
      setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 800);
    }
    function float(txt, color) {
      var d = document.createElement('div');
      d.className = 'mine-float';
      d.textContent = txt;
      if (color) d.style.color = color;
      wrap.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 900);
    }
    function glow(n) {
      var cls = n >= 5 ? 'glow-3' : n >= 2 ? 'glow-2' : '';
      if (!cls) return;
      boardEl.classList.remove('glow-2', 'glow-3');
      void boardEl.offsetWidth;
      boardEl.classList.add(cls);
      setTimeout(function () { boardEl.classList.remove(cls); }, 850);
    }

    /* ---------- 渲染 ---------- */
    function buildDom() {
      boardEl.innerHTML = '';
      cellEls.length = 0;
      for (var r = 0; r < rows; r++) {
        cellEls[r] = [];
        for (var c = 0; c < cols; c++) {
          var d = document.createElement('button');
          d.className = 'mg-cell';
          d.dataset.r = r; d.dataset.c = c;
          d.addEventListener('click', (function (rr, cc) { return function () { tap(rr, cc); }; })(r, c));
          boardEl.appendChild(d);
          cellEls[r][c] = d;
        }
      }
    }

    function paint() {
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var d = cellEls[r][c], v = grid[r][c];
          var isSel = sel.some(function (s) { return s.r === r && s.c === c; });
          d.textContent = v === EMPTY ? '' : v;
          d.className = 'mg-cell' + (v === EMPTY ? ' empty' : '') + (isSel ? ' sel' : '') +
            (freshCells[r + ',' + c] ? ' drop' : '');
          if (v !== EMPTY) d.style.setProperty('--c', COLORS[v % COLORS.length]);
        }
      }
      freshCells = {};
      scoreEl.textContent = score;
      timeEl.textContent = timeLeft;
      updateFormula();
    }

    function updateFormula() {
      if (sel.length === 0) {
        formEl.textContent = '\u70B9\u9009 3 \u5757\uFF0C\u51D1\u51FA\u300C\u00D7\u300D\u7B97\u5F0F';
        formEl.className = 'mg-formula';
        return;
      }
      var nums = sel.map(function (s) { return grid[s.r][s.c]; });
      formEl.textContent = nums.join(' , ') + (sel.length < 3 ? '  \u518D\u9009 ' + (3 - sel.length) + ' \u5757' : '');
      formEl.className = 'mg-formula' + (sel.length === 3 ? ' full' : '');
    }

    function tap(r, c) {
      if (over || locked || grid[r][c] === EMPTY) return;
      var idx = sel.findIndex(function (s) { return s.r === r && s.c === c; });
      if (idx >= 0) { sel.splice(idx, 1); paint(); return; }
      if (sel.length >= 3) sel.shift();
      sel.push({ r: r, c: c });
      beep('tick');
      paint();
      if (sel.length === 3) setTimeout(resolve, 170);
    }

    function resolve() {
      if (over || busy) return;
      var nums = sel.map(function (s) { return grid[s.r][s.c]; });
      var res = evaluateTriple(nums);

      if (!res) {
        locked = true;
        sel.forEach(function (s) { cellEls[s.r][s.c].classList.add('bad'); });
        beep('bad');
        setTimeout(function () {
          sel.forEach(function (s) { cellEls[s.r][s.c].classList.remove('bad'); });
          sel = []; locked = false; paint();
        }, 430);
        return;
      }

      /* ---- 命中：完整反馈链 ---- */
      busy = true;
      var gain = res.c;
      score += gain;
      matched++;
      levelScore += gain;
      scoreEl.textContent = score;
      bump(scoreBox);

      formEl.textContent = res.a + ' \u00D7 ' + res.b + ' = ' + res.c + '\u3000+' + gain + ' \u5206';
      formEl.className = 'mg-formula hit';

      var cleared = sel.map(function (s) { return { r: s.r, c: s.c }; });
      var extra = Math.min(modClear(res.c), MAX_RANDOM_CLEAR);
      if (extra > 0) {
        var pool = [];
        for (var r = 0; r < rows; r++)
          for (var c = 0; c < cols; c++)
            if (grid[r][c] !== EMPTY && !cleared.some(function (x) { return x.r === r && x.c === c; }))
              pool.push({ r: r, c: c });
        shuffle(pool);
        pool.slice(0, extra).forEach(function (p) { cleared.push(p); });
      }

      // 碎裂 + 宝石飞向计分区（追加越多，飞出的宝石越多）
      cleared.forEach(function (p) {
        var d = cellEls[p.r][p.c];
        d.classList.add('crack');
        flyGem(d, scoreBox);
      });
      beep(extra >= 3 ? 'combo' : 'ok');
      float('+' + gain + (extra > 0 ? '\u3000\u8FFD\u52A0 ' + extra + ' \u5757' : ''));
      if (extra > 0) glow(extra);

      sel = [];
      locked = true;

      setTimeout(function () {
        cleared.forEach(function (p) { grid[p.r][p.c] = EMPTY; });
        var fresh = refill(grid, rows, cols, vs);
        fresh.forEach(function (k) { freshCells[k] = 1; });
        paint();
        // 死局兜底：无解则重排
        var g2 = 0;
        while (!findTriple(grid, rows, cols, vs) && g2++ < 40) {
          for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols; cc++) grid[rr][cc] = pick(vs);
        }
        if (g2 > 0) {
          paint();
          formEl.textContent = '\u6CA1\u6709\u53EF\u51D1\u7684\u7B97\u5F0F\u4E86\uFF0C\u5DF2\u91CD\u65B0\u6392\u5217 \uD83D\uDD04';
          formEl.className = 'mg-formula warn';
        }
        locked = false; busy = false;
        // 达标立刻过关，不让孩子达标后干等时间走完
        if (!over && levelScore >= target) levelEnd();
      }, 460);
    }

    function hint() {
      if (over || locked) return;
      var t = findTriple(grid, rows, cols, vs);
      if (!t) return;
      sel = t.map(function (x) { return { r: x.r, c: x.c }; });
      paint();
      t.forEach(function (x) { cellEls[x.r][x.c].classList.add('hint'); });
      setTimeout(function () {
        t.forEach(function (x) { cellEls[x.r][x.c].classList.remove('hint'); });
      }, 900);
      setTimeout(resolve, 1000);
    }

    /* ---------- 关卡 ---------- */
    function startLevel(i) {
      lv = i;
      var L = LEVELS[i];
      vs = buildValueSet(L.factorRange[0], L.factorRange[1], L.maxVal || 81);
      target = L.targetScore;
      timeSec = L.timeSec;
      timeLeft = timeSec;
      levelScore = 0;
      sel = []; locked = false; busy = false; freshCells = {};

      grid = makeGrid(rows, cols, vs);
      var guard = 0;
      while (!findTriple(grid, rows, cols, vs) && guard++ < 80) grid = makeGrid(rows, cols, vs);

      lvEl.textContent = '\u7B2C ' + (i + 1) + '/' + LEVELS.length + ' \u5173 \u00B7 ' + L.name +
        ' \u76EE\u6807 ' + target;
      timeBox.classList.remove('urgent');

      buildDom();
      paint();

      if (timer) clearInterval(timer);
      timer = setInterval(tick, 1000);
    }

    function tick() {
      if (over) return;
      timeLeft--;
      timeEl.textContent = timeLeft;
      timeBox.classList.toggle('urgent', timeLeft <= 10);
      if (timeLeft <= 0) levelEnd();
    }

    function levelEnd() {
      if (over) return;
      if (timer) clearInterval(timer);
      var L = LEVELS[lv];
      var ok = levelScore >= L.targetScore;
      if (ok) passed++;
      if (ok && lv < LEVELS.length - 1) {
        // 过关 → 下一关
        locked = true; busy = true;
        var d = document.createElement('div');
        d.className = 'mine-mask';
        d.innerHTML =
          '<div class="mine-mbox">' +
            '<div class="mm-emoji">\uD83C\uDF89</div>' +
            '<div class="mm-title">\u7B2C ' + (lv + 1) + ' \u5173\u8FC7\uFF01</div>' +
            '<div class="mm-sub">\u672C\u5173 ' + levelScore + ' \u5206\uFF08\u76EE\u6807 ' + L.targetScore + '\uFF09<br>' +
              '\u4E0B\u4E00\u5173\uFF1A<b>' + LEVELS[lv + 1].name + '</b></div>' +
            '<button class="mm-btn">\u7EE7\u7EED</button>' +
          '</div>';
        wrap.appendChild(d);
        beep('win');
        d.querySelector('.mm-btn').addEventListener('click', function () {
          if (d.parentNode) d.parentNode.removeChild(d);
          busy = false;
          startLevel(lv + 1);
        });
      } else {
        finish();
      }
    }

    function finish() {
      if (over) return;
      over = true;
      if (timer) clearInterval(timer);
      var stars = passed >= 3 ? 3 : passed === 2 ? 2 : passed === 1 ? 1 : 0;
      if (stars > 0) beep('win'); else beep('bad');
      onFinish({ score: score, stars: stars, matched: matched, passed: passed });
    }

    wrap.querySelector('.mg-hint').addEventListener('click', hint);
    wrap.querySelector('.mg-quit').addEventListener('click', finish);
    window.__mgActive = function () { if (timer) clearInterval(timer); };

    startLevel(0);
  }

  window.MatchEngine = {
    mount: mount,
    _logic: {
      evaluateTriple: evaluateTriple, buildValueSet: buildValueSet,
      modClear: modClear, findTriple: findTriple, makeGrid: makeGrid
    }
  };
})();
