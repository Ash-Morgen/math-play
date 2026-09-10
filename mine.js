/* 宝石矿工 · 凑数消除玩法
   核心：不做计算，而是找两块凑出目标数（凑十 / 凑整十 / 凑整百）
   由 grade2.js 以 kind:'mine' 调用

   cfg = { targets: [20, 50, 100], timeSec: 50, cols: 4 }
   done(ok) —— ok 表示三星制里是否达到 1 星
*/
(function () {
  'use strict';

  var RI = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sfx() {
    try { return window.Sfx || {}; } catch (e) { return {}; }
  }
  function beep(k) {
    var s = sfx();
    if (typeof s[k] === 'function') { try { s[k](); } catch (e) { } }
  }

  function mount(root, cfg, done) {
    cfg = cfg || {};
    var TARGETS = cfg.targets || [20, 50, 100];
    var LEVEL_TIME = cfg.timeSec || 50;
    var COLS = cfg.cols || 4;
    var N = COLS * COLS;

    var stage = 0, target = TARGETS[0];
    var score = 0, combo = 0, best = 0, timeLeft = LEVEL_TIME;
    var grid = [], sel = [], locked = false, timer = null, over = false;
    var popped = {};   // 刚补上的格子，渲染时做弹出动画
    var hits = 0, misses = 0;

    var wrap = document.createElement('div');
    wrap.className = 'mine-wrap';
    wrap.innerHTML =
      '<div class="mine-bar">' +
        '<span class="mp">\uD83D\uDC8E <b class="m-score">0</b></span>' +
        '<span class="mp">\u8FDE\u51FB <b class="m-combo">0</b></span>' +
        '<span class="mp m-timebox">\u23F1 <b class="m-time">' + LEVEL_TIME + '</b>s</span>' +
      '</div>' +
      '<div class="mine-goal">' +
        '<span class="mg-t">\u70B9\u4E24\u5757\u77F3\u5934\uFF0C\u8BA9\u5B83\u4EEC\u7684\u548C\u6B63\u597D\u662F</span>' +
        '<span class="mg-n">' + target + '</span>' +
      '</div>' +
      '<div class="mine-board"></div>' +
      '<div class="mine-tip">\u70B9\u4E00\u4E0B\u9009\u4E2D\uFF0C\u518D\u70B9\u53E6\u4E00\u5757\u51D1\u51FA\u76EE\u6807\u6570</div>';

    var $board = wrap.querySelector('.mine-board');
    var $goal = wrap.querySelector('.mg-n');
    var $score = wrap.querySelector('.m-score');
    var $combo = wrap.querySelector('.m-combo');
    var $time = wrap.querySelector('.m-time');
    var $timeBox = wrap.querySelector('.m-timebox');
    var $tip = wrap.querySelector('.mine-tip');

    $board.style.gridTemplateColumns = 'repeat(' + COLS + ',1fr)';

    /* ---------- 数字生成 ---------- */
    function makeNum() {
      var r = Math.random();
      if (target <= 20) {
        return r < .7 ? RI(1, 9) : RI(1, target - 1);
      }
      if (r < .35) return RI(1, 9) * 10;                  // 整十
      if (r < .65) return RI(1, 9) * 10 + RI(1, 9);        // 两位数
      if (r < .85) return RI(2, 9) * 10;
      return RI(11, target - 1);
    }

    function buildGrid() {
      var arr = new Array(N), used = 0;
      var idx = shuffle(Array.from({ length: N }, function (_, i) { return i; }));
      var need = Math.max(3, Math.floor(N / 4));            // 至少塞这么多可配对
      var k = 0;
      for (var p = 0; p < need && k + 1 < N; p++) {
        var a = RI(1, target - 1);
        var b = target - a;
        if (b < 1) continue;
        arr[idx[k++]] = a;
        arr[idx[k++]] = b;
      }
      for (var i = 0; i < N; i++) if (arr[i] === undefined) arr[i] = makeNum();
      grid = arr;
    }

    /* 保证盘面一定有解（否则会卡死） */
    function ensureSolvable() {
      var cnt = {};
      grid.forEach(function (v) { if (v) cnt[v] = (cnt[v] || 0) + 1; });
      var ok = false;
      for (var i = 0; i < grid.length && !ok; i++) {
        var v = grid[i];
        if (!v) continue;
        var n = target - v;
        if (n >= 1 && cnt[n] !== undefined) {
          if (n === v ? cnt[n] >= 2 : true) ok = true;
        }
      }
      if (!ok) {
        var a = RI(1, target - 1), b = target - a;
        var i1 = RI(0, N - 1), i2 = RI(0, N - 1);
        while (i2 === i1) i2 = RI(0, N - 1);
        grid[i1] = a; grid[i2] = b;
      }
    }

    /* ---------- 渲染 ---------- */
    function render() {
      $board.innerHTML = '';
      grid.forEach(function (v, i) {
        var b = document.createElement('button');
        b.className = 'rock' + (sel.indexOf(i) >= 0 ? ' sel' : '') + (popped[i] ? ' pop' : '');
        b.textContent = v === 0 ? '' : v;
        if (v === 0) b.classList.add('empty');
        b.addEventListener('click', function () { tap(i); });
        $board.appendChild(b);
      });
      $goal.textContent = target;
      $score.textContent = score;
      $combo.textContent = combo;
      popped = {};
    }

    function tap(i) {
      if (locked || over || grid[i] === 0) return;
      var at = sel.indexOf(i);
      if (at >= 0) { sel.splice(at, 1); render(); return; }
      sel.push(i);
      render();
      beep('tick');
      if (sel.length === 2) check();
    }

    function check() {
      locked = true;
      var a = grid[sel[0]], b = grid[sel[1]];
      var cells = $board.children;
      if (a + b === target) {
        hits++;
        combo++;
        if (combo > best) best = combo;
        var gain = 10 * combo;
        score += gain;
        $score.textContent = score;
        $combo.textContent = combo;

        // 计分板弹跳（数字变化要有"打中"的手感）
        bump($score.parentElement);
        if (combo >= 2) bump($combo.parentElement);

        // 石头碎裂 + 宝石飞进计分区
        sel.forEach(function (i) {
          var c = cells[i];
          grid[i] = 0;
          c.classList.add('crack');
          flyGem(c, $score.parentElement);
          if (!c.__gemmed) { c.__gemmed = true; }
        });

        beep(combo >= 2 ? 'combo' : 'ok');
        // 每一次消除都要有飘字（原来只在连击时才飘）
        showFloat(combo >= 2 ? '\u8FDE\u51FB \u00D7' + combo + '  +' + gain : '+' + gain);
        if (combo >= 2) glow(combo);

        $tip.textContent = a + ' + ' + b + ' = ' + target + '\u3000\uD83D\uDC8E \u70B8\u5F00\u5566\uFF01+' + gain;
        setTimeout(function () {
          sel = []; locked = false;
          refill(); ensureSolvable(); render();
        }, 460);
      } else {
        misses++;
        combo = 0;
        $combo.textContent = combo;
        sel.forEach(function (i) { cells[i].classList.add('bad'); });
        beep('bad');
        $tip.textContent = a + ' + ' + b + ' = ' + (a + b) + '\uFF0C\u4E0D\u662F ' + target + '\uFF0C\u518D\u60F3\u60F3';
        setTimeout(function () { sel = []; locked = false; render(); }, 460);
      }
    }

    function refill() {
      for (var i = 0; i < grid.length; i++) {
        if (grid[i] === 0) { grid[i] = makeNum(); popped[i] = 1; }   // 标记新块，渲染时弹出
      }
    }

    /* 计分板弹跳 */
    function bump(elm) {
      if (!elm) return;
      elm.classList.remove('bump');
      void elm.offsetWidth;               // 强制重排，让动画能重放
      elm.classList.add('bump');
      setTimeout(function () { elm.classList.remove('bump'); }, 460);
    }

    /* 宝石从石头飞进计分区 */
    function flyGem(fromEl, toEl) {
      if (!fromEl || !toEl) return;
      var r1 = fromEl.getBoundingClientRect();
      var r2 = toEl.getBoundingClientRect();
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

    /* 连击越高，棋盘光晕越强 */
    function glow(n) {
      var cls = n >= 4 ? 'glow-3' : n >= 2 ? 'glow-2' : '';
      if (!cls) return;
      $board.classList.remove('glow-2', 'glow-3');
      void $board.offsetWidth;
      $board.classList.add(cls);
      setTimeout(function () { $board.classList.remove(cls); }, 850);
    }

    function showFloat(txt) {
      var d = document.createElement('div');
      d.className = 'mine-float';
      d.textContent = txt;
      wrap.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 850);
    }

    /* ---------- 计时与关卡 ---------- */
    function tick() {
      if (over) return;
      timeLeft--;
      $time.textContent = timeLeft;
      $timeBox.classList.toggle('low', timeLeft <= 12);
      if (timeLeft <= 0) nextStage();
    }

    function nextStage() {
      clearInterval(timer);
      locked = true;
      stage++;
      if (stage >= TARGETS.length) { finish(); return; }
      target = TARGETS[stage];
      timeLeft = LEVEL_TIME;
      sel = [];
      buildGrid(); ensureSolvable(); render();
      $time.textContent = timeLeft;
      $timeBox.classList.remove('low');

      var d = document.createElement('div');
      d.className = 'mine-mask';
      d.innerHTML =
        '<div class="mine-mbox">' +
          '<div class="mm-emoji">\u26CF\uFE0F</div>' +
          '<div class="mm-title">\u6316\u5230\u66F4\u6DF1\u5904\uFF01</div>' +
          '<div class="mm-sub">\u65B0\u76EE\u6807\uFF1A\u51D1\u51FA <b>' + target + '</b><br>' +
            '\u5DF2\u5F97 <b>' + score + '</b> \u9897\u5B9D\u77F3</div>' +
          '<button class="mm-btn">\u7EE7\u7EED\u6316</button>' +
        '</div>';
      wrap.appendChild(d);
      d.querySelector('.mm-btn').addEventListener('click', function () {
        if (d.parentNode) d.parentNode.removeChild(d);
        locked = false;
        timer = setInterval(tick, 1000);
      });
    }

    function starCount() {
      if (score >= 500) return 3;
      if (score >= 320) return 2;
      if (score >= 180) return 1;
      return 0;
    }

    function finish() {
      over = true;
      var st = starCount();
      if (window.MineGame && window.MineGame.lastStars !== undefined) window.MineGame.lastStars = st;
      window.__mineStars = st;
      window.__mineScore = score;
      if (typeof done === 'function') done({ stars: st, score: score, hits: hits, misses: misses });
    }

    root.appendChild(wrap);
    buildGrid();
    ensureSolvable();
    render();
    timer = setInterval(tick, 1000);

    /* 供外层（如结算页）读取 */
    return {
      stop: function () { clearInterval(timer); over = true; },
      stats: function () { return { score: score, stars: starCount(), hits: hits, misses: misses, bestCombo: best }; }
    };
  }

  window.MineGame = { mount: mount };
})();
