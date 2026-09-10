/* 扩展玩法：方向迷宫 / 拖到正确方位 / 拖小人就位 / 拖苹果分组
   依赖 drag.js 暴露的 window.DragEngine._utils
   以「包装 mount」的方式接入，不改动 drag.js 本体 */
(function () {
  'use strict';
  var D = window.DragEngine;
  if (!D || !D._utils) { console.error('drag-extra.js 需要先加载 drag.js'); return; }
  var U = D._utils;
  var el = U.el, dragify = U.dragify, shake = U.shake, Sfx = U.Sfx;

  /* ================= 方向迷宫 ================= */
  /* q = { prompt, size, start:{r,c}, goal:{r,c} } */
  function buildMaze(q, root, done) {
    var scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    var pos = { r: q.start.r, c: q.start.c }, steps = 0, finished = false;

    var board = el('div', 'maze-board');
    board.style.gridTemplateColumns = 'repeat(' + q.size + ',1fr)';
    var cells = [];
    for (var r = 0; r < q.size; r++) {
      cells[r] = [];
      for (var c = 0; c < q.size; c++) {
        var d = el('div', 'maze-cell');
        board.appendChild(d);
        cells[r][c] = d;
      }
    }

    var stepEl = el('div', 'maze-steps', '步数 0');
    var pad = el('div', 'maze-pad');
    pad.innerHTML =
      '<div></div><button class="mp-btn" data-d="n">北 ↑</button><div></div>' +
      '<button class="mp-btn" data-d="w">西 ←</button><div class="mp-mid">🧭</div>' +
      '<button class="mp-btn" data-d="e">东 →</button>' +
      '<div></div><button class="mp-btn" data-d="s">南 ↓</button><div></div>';

    var MOVES = { n: [-1, 0], s: [1, 0], w: [0, -1], e: [0, 1] };

    function paint() {
      for (var r = 0; r < q.size; r++) {
        for (var c = 0; c < q.size; c++) {
          var d = cells[r][c];
          d.textContent = '';
          d.className = 'maze-cell';
          if (r === q.goal.r && c === q.goal.c) { d.textContent = '🏠'; d.classList.add('goal'); }
          if (r === pos.r && c === pos.c) { d.textContent = '🧒'; d.classList.add('me'); }
        }
      }
      stepEl.textContent = '步数 ' + steps;
    }

    function move(dirKey) {
      if (finished) return;
      var mv = MOVES[dirKey];
      var nr = pos.r + mv[0], nc = pos.c + mv[1];
      if (nr < 0 || nr >= q.size || nc < 0 || nc >= q.size) {
        Sfx().bad();
        board.classList.add('shake');
        setTimeout(function () { board.classList.remove('shake'); }, 400);
        return;                                    // 撞墙不动
      }
      pos = { r: nr, c: nc };
      steps++;
      Sfx().tick();
      paint();
      if (pos.r === q.goal.r && pos.c === q.goal.c) {
        finished = true;
        Sfx().win();
        setTimeout(function () { done(true); }, 620);
      }
    }

    pad.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.mp-btn') : null;
      if (b) move(b.getAttribute('data-d'));
    });

    scene.appendChild(board);
    scene.appendChild(stepEl);
    scene.appendChild(pad);
    scene.appendChild(el('div', 'drag-hint', '点方向键，把 🧒 走到 🏠 就算到啦'));
    paint();
    root.appendChild(scene);
  }

  /* ================= 拖到正确方位 ================= */
  /* q = { prompt, items:[{emoji,label,dir}] }  dir ∈ 北/东/南/西 */
  function buildPlace(q, root, done) {
    var scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    // 3×3 九宫格：索引 0~8，中心 4 是家
    var CELL = { '北': 1, '西': 3, '东': 5, '南': 7 };
    var board = el('div', 'place-board');
    for (var i = 0; i < 9; i++) {
      var d = el('div', 'place-cell');
      if (i === 4) { d.classList.add('home'); d.textContent = '🏠'; }
      else {
        var dirName = null;
        for (var k in CELL) if (CELL[k] === i) dirName = k;
        if (dirName) d.setAttribute('data-accept', dirName);
        else d.classList.add('off');
      }
      board.appendChild(d);
    }

    var pool = el('div', 'drag-pool');
    var left = q.items.length, wrong = 0;

    q.items.forEach(function (it) {
      var card = el('div', 'drag-item place-item',
        '<span class="pi-emoji">' + it.emoji + '</span><span class="pi-label">' + it.label + '</span>');
      card.setAttribute('data-dir', it.dir);
      dragify(card, {
        onDrop: function (node, target) {
          var cell = target && target.closest ? target.closest('.place-cell') : null;
          if (!cell || !cell.getAttribute('data-accept')) { shake(node); return; }
          if (cell.getAttribute('data-accept') === node.getAttribute('data-dir')) {
            node.setAttribute('data-locked', '1');
            node.classList.add('placed');
            node.classList.remove('place-item');
            cell.appendChild(node);
            Sfx().ok();
            left--;
            if (left === 0) setTimeout(function () { done(wrong <= 1); }, 500);
          } else {
            shake(node); Sfx().bad(); wrong++;
          }
        }
      });
      pool.appendChild(card);
    });

    scene.appendChild(board);
    scene.appendChild(pool);
    scene.appendChild(el('div', 'drag-hint', '看清楚「在我家的哪一面」，再拖过去'));
    root.appendChild(scene);
  }

  /* ================= 拖小人就位 ================= */
  /* q = { prompt, slots, answer, person:{emoji,name} }  从头数第 answer 个位置 */
  function buildSeat(q, root, done) {
    var scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    var row = el('div', 'seat-row');
    for (var i = 0; i < q.slots; i++) {
      var d = el('div', 'seat-slot');
      d.setAttribute('data-idx', String(i + 1));
      d.appendChild(el('span', 'seat-no', String(i + 1)));
      row.appendChild(d);
    }

    var pool = el('div', 'drag-pool');
    var wrong = 0, solved = false;

    var card = el('div', 'drag-item seat-person',
      '<span class="pi-emoji">' + q.person.emoji + '</span><span class="pi-label">' + q.person.name + '</span>');
    dragify(card, {
      onDrop: function (node, target) {
        var slot = target && target.closest ? target.closest('.seat-slot') : null;
        if (!slot || solved) { shake(node); return; }
        if (Number(slot.getAttribute('data-idx')) === q.answer) {
          solved = true;
          node.setAttribute('data-locked', '1');
          node.classList.add('placed');
          node.classList.remove('seat-person');
          slot.appendChild(node);
          slot.classList.add('filled');
          Sfx().ok();
          setTimeout(function () { done(wrong <= 1); }, 600);
        } else {
          shake(node); Sfx().bad(); wrong++;
        }
      }
    });
    pool.appendChild(card);

    scene.appendChild(pool);
    scene.appendChild(row);
    scene.appendChild(el('div', 'drag-hint', '从左往右数，数到第几个位置'));
    root.appendChild(scene);
  }

  /* ================= 拖苹果分组 ================= */
  /* q = { prompt, total, boxes, emoji }  平均分到 boxes 个盘子 */
  function buildGroup(q, root, done) {
    var scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    var row = el('div', 'group-row');
    var boxes = [];
    for (var i = 0; i < q.boxes; i++) {
      var b = el('div', 'group-box');
      b.appendChild(el('div', 'gb-label', '第 ' + (i + 1) + ' 盘'));
      b.appendChild(el('div', 'gb-items'));
      row.appendChild(b);
      boxes.push(b);
    }

    var pool = el('div', 'drag-pool');
    var wrong = 0, solved = false;
    var check = el('div', 'group-check');

    function counts() {
      return boxes.map(function (b) { return b.querySelectorAll('.drag-item').length; });
    }

    function verify() {
      var cs = counts();
      var leftInPool = pool.querySelectorAll('.drag-item').length;
      var nonEmpty = cs.filter(function (n) { return n > 0; });
      var allSame = nonEmpty.length === q.boxes && nonEmpty.every(function (n) { return n === nonEmpty[0]; });
      // 必须「苹果全部分完」且「每盘一样多」才算完成；
      // 否则只放 1 个到每盘也会被判成功（池子里还剩一堆）
      if (allSame && leftInPool === 0 && !solved) {
        solved = true;
        Sfx().win();
        var per = nonEmpty[0];
        check.className = 'group-check good';
        check.textContent = '✅ 每盘 ' + per + ' 个　→　' + q.boxes + ' 个 ' + per +
          ' 就是 ' + q.boxes + ' × ' + per + ' = ' + q.total;
        setTimeout(function () { done(wrong <= 2); }, 900);
      } else {
        check.className = 'group-check';
        check.textContent = '现在每盘：' + cs.join(' / ') + ' 个' +
          (leftInPool > 0 ? '（还有 ' + leftInPool + ' 个没分）' : '');
      }
    }

    for (var j = 0; j < q.total; j++) {
      (function () {
        var apple = el('div', 'drag-item apple', q.emoji);
        dragify(apple, {
          onDrop: function (node, target) {
            var box = target && target.closest ? target.closest('.group-box') : null;
            if (box && !solved) {
              node.setAttribute('data-locked', '1');
              node.classList.add('placed');
              box.querySelector('.gb-items').appendChild(node);
              Sfx().tick();
              verify();
            } else {
              shake(node); wrong++;
            }
          }
        });
        pool.appendChild(apple);
      })();
    }

    scene.appendChild(pool);
    scene.appendChild(row);
    scene.appendChild(check);
    scene.appendChild(el('div', 'drag-hint', '每个盘子里的个数要一样多'));
    verify();
    root.appendChild(scene);
  }

  /* ---------- 接入 ---------- */
  var orig = D.mount;
  D.mount = function (root, q, done) {
    if (q.type === 'maze') return buildMaze(q, root, done);
    if (q.type === 'place') return buildPlace(q, root, done);
    if (q.type === 'seat') return buildSeat(q, root, done);
    if (q.type === 'group') return buildGroup(q, root, done);
    return orig(root, q, done);
  };
})();
