/* 拖拽引擎 + 操作型玩法
   设计要点：
   - Pointer Events 统一鼠标 / 触屏 / 触控笔
   - 拖动时把元素设成 pointer-events:none，松手用 elementFromPoint 命中落点
   - 松手判定放在 document 级监听，避免元素自身不接收事件
   玩法：classify 拖拽分类 / pay 拖钱币付钱 / vfill 竖式填数 / count 点击计数 */
(function () {
  'use strict';

  const Sfx = () => window.Sfx || { ok: function () { }, bad: function () { }, win: function () { }, tick: function () { } };

  function el(tag, cls, html) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    return d;
  }

  /* ---------- 通用拖拽 ---------- */
  function dragify(node, opts) {
    node.addEventListener('pointerdown', function (e) {
      if (node.dataset.locked === '1') return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY;
      node.classList.add('dragging');
      // 关键：让被拖元素对命中检测透明，这样 elementFromPoint 能拿到下面的容器
      node.style.pointerEvents = 'none';

      function onMove(ev) {
        node.style.transform = 'translate(' + (ev.clientX - sx) + 'px,' + (ev.clientY - sy) +
          'px) scale(1.14) rotate(-3deg)';
      }
      function onUp(ev) {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        node.classList.remove('dragging');
        node.style.transform = '';
        node.style.pointerEvents = '';
        let target = null;
        try { target = document.elementFromPoint(ev.clientX, ev.clientY); } catch (_) { }
        // 传了 near 选择器就做「就近吸附」：落点没命中就找 30px 内最近的容器
        if (opts.near) {
          const precise = (target && target.closest) ? target.closest(opts.near) : null;
          target = precise || hitNear(ev.clientX, ev.clientY, opts.near);
        }
        if (opts.onDrop) opts.onDrop(node, target);
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  /**
   * 松手时的目标命中：先看精确落点，没命中就向四周扩 pad 像素找最近的容器。
   * 孩子手指不精准，落在框边缘外一点也应该算成功。
   */
  function hitNear(x, y, sel, pad) {
    pad = pad === undefined ? 30 : pad;
    var el0 = null;
    try { el0 = document.elementFromPoint(x, y); } catch (e) { }
    if (el0 && el0.closest) {
      var direct = el0.closest(sel);
      if (direct) return direct;
    }
    var list = document.querySelectorAll(sel);
    var best = null, bestD = Infinity;
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      var dx = Math.max(r.left - x, 0, x - r.right);
      var dy = Math.max(r.top - y, 0, y - r.bottom);
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd <= pad && dd < bestD) { best = list[i]; bestD = dd; }
    }
    return best;
  }

  function shake(node) {
    node.classList.add('shake');
    setTimeout(function () { node.classList.remove('shake'); }, 430);
  }

  function shuffleArr(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ================= 玩法 A：分类拖拽 ================= */
  /* q = { prompt, items:[{emoji,group}], bins:[{label,accept}] } */
  function buildClassify(q, root, done) {
    const scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    const pool = el('div', 'drag-pool');
    const binRow = el('div', 'drag-bins');

    let remaining = q.items.length, wrong = 0;

    q.bins.forEach(function (b) {
      const bin = el('div', 'drag-bin');
      bin.dataset.accept = b.accept;
      bin.appendChild(el('div', 'bin-label', b.label));
      bin.appendChild(el('div', 'bin-items'));
      binRow.appendChild(bin);
    });

    q.items.forEach(function (it) {
      // 带 label 的物体显示「图标+文字」，否则光看 emoji 分不清（如各种钱币）
      const item = el('div', 'drag-item' + (it.label ? ' has-label' : ''),
        it.emoji + (it.label ? '<b class="di-label">' + it.label + '</b>' : ''));
      item.dataset.group = it.group;
      dragify(item, {
        near: '.drag-bin',
        onDrop: function (node, target) {
          const bin = target && target.closest ? target.closest('.drag-bin') : null;
          if (bin && bin.dataset.accept === node.dataset.group) {
            node.dataset.locked = '1';
            node.classList.add('placed');
            bin.querySelector('.bin-items').appendChild(node);
            Sfx().ok();
            remaining--;
            if (remaining === 0) setTimeout(function () { done(wrong <= 1); }, 420);
          } else {
            shake(node);
            Sfx().bad();
            wrong++;
          }
        }
      });
      pool.appendChild(item);
    });

    scene.appendChild(pool);
    scene.appendChild(el('div', 'drag-hint', '把上面的图形拖到下面对应的筐里'));
    scene.appendChild(binRow);
    root.appendChild(scene);
  }

  /* ================= 玩法 B：拖钱币付钱 ================= */
  /* q = { prompt, price, coins:[1,2,5,10] } */
  function buildPay(q, root, done) {
    const scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    const board = el('div', 'pay-board');
    const counter = el('div', 'pay-counter');
    counter.innerHTML = '<span class="pc-label">已付</span><span class="pc-val">0</span><span class="pc-unit">元</span><span class="pc-diff"></span>';
    board.appendChild(counter);

    const cashier = el('div', 'drag-bin cashier');
    cashier.dataset.accept = 'money';
    cashier.appendChild(el('div', 'bin-label', '💵 收银台（把币拖进来）'));
    cashier.appendChild(el('div', 'bin-items'));
    board.appendChild(cashier);
    scene.appendChild(board);

    const pool = el('div', 'drag-pool coins');
    let paid = 0, settled = false, wrong = 0;

    function refresh() {
      counter.querySelector('.pc-val').textContent = paid;
      const diff = counter.querySelector('.pc-diff');
      if (paid < q.price) { diff.textContent = '还差 ' + (q.price - paid) + ' 元'; diff.className = 'pc-diff need'; }
      else if (paid === q.price) { diff.textContent = '刚好！'; diff.className = 'pc-diff exact'; }
      else { diff.textContent = '多付了 ' + (paid - q.price) + ' 元'; diff.className = 'pc-diff over'; }
      if (paid === q.price) counter.classList.add('exact');
      else counter.classList.remove('exact');
      if (!settled && paid >= q.price) {
        settled = true;
        Sfx().win();
        const change = paid - q.price;
        board.appendChild(el('div', 'pay-result ' + (change === 0 ? 'good' : 'warn'),
          change === 0 ? '✅ 刚好付清！' : '✅ 付清了，要找回 ' + change + ' 元'));
        setTimeout(function () { done(wrong <= 1); }, 900);
      }
    }

    q.coins.forEach(function (v) {
      const coin = el('div', 'drag-item coin v' + v, v + '元');
      coin.dataset.v = String(v);
      dragify(coin, {
        near: '.drag-bin',
        onDrop: function (node, target) {
          const bin = target && target.closest ? target.closest('.drag-bin') : null;
          if (bin && bin.dataset.accept === 'money' && !settled) {
            paid += Number(node.dataset.v);
            const float = el('div', 'coin-fly', '+' + node.dataset.v);
            bin.appendChild(float);
            setTimeout(function () { float.remove(); }, 700);
            Sfx().ok();
            node.classList.add('used');
            setTimeout(function () { node.classList.remove('used'); }, 320);
            refresh();
          } else if (!bin) {
            shake(node);
            wrong++;
          }
        }
      });
      pool.appendChild(coin);
    });

    scene.appendChild(pool);
    root.appendChild(scene);
    refresh();
  }

  /* ================= 玩法 C：竖式填数 ================= */
  /* q = { prompt, a, b, c, op, hide:'a1'|'a0'|..., ans, digits:[...] } */
  function buildVfill(q, root, done) {
    const scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    const calc = el('div', 'vfill-calc');

    // 把一个两位数渲染成数位格；hide 指定的位渲染成空槽（key: 前缀+位序，0=个位）
    function digitsRow(numStr, prefix) {
      let h = '';
      for (let i = 0; i < numStr.length; i++) {
        const key = prefix + (numStr.length - 1 - i);
        h += (key === q.hide)
          ? '<span class="vslot" data-slot="' + key + '"></span>'
          : '<span class="vdigit">' + numStr[i] + '</span>';
      }
      return h;
    }

    calc.innerHTML =
      '<div class="vrow">' + digitsRow(String(q.a), 'a') + '</div>' +
      '<div class="vrow"><span class="vop">' + q.op + '</span>' + digitsRow(String(q.b), 'b') + '</div>' +
      '<div class="vline"></div>' +
      '<div class="vrow">' + digitsRow(String(q.c), 'c') + '</div>';
    scene.appendChild(calc);

    const pool = el('div', 'drag-pool');
    let solved = false, wrong = 0;

    q.digits.forEach(function (d) {
      const chip = el('div', 'drag-item chip', String(d));
      chip.dataset.val = String(d);
      dragify(chip, {
        near: '.vslot',
        onDrop: function (node, target) {
          const slot = target && target.closest ? target.closest('.vslot') : null;
          if (!slot) { shake(node); return; }
          if (Number(node.dataset.val) === q.ans) {
            slot.textContent = node.dataset.val;
            slot.classList.add('filled');
            node.dataset.locked = '1';
            node.classList.add('placed');
            Sfx().ok();
            if (!solved) { solved = true; setTimeout(function () { done(wrong <= 1); }, 650); }
          } else {
            shake(node);
            Sfx().bad();
            wrong++;
          }
        }
      });
      pool.appendChild(chip);
    });

    scene.appendChild(pool);
    scene.appendChild(el('div', 'drag-hint', '想一想：这一位应该是几？'));
    root.appendChild(scene);
  }

  /* ================= 玩法 D：点击计数 ================= */
  /* q = { prompt, items:[{emoji}], groups:[{emoji,label}] } */
  function buildCount(q, root, done) {
    const scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    const area = el('div', 'count-area');
    const table = el('div', 'count-table');
    const tally = {};
    q.groups.forEach(function (g) { tally[g.emoji] = 0; });

    function renderTable() {
      table.innerHTML = q.groups.map(function (g) {
        const n = tally[g.emoji];
        return '<div class="ctrow"><span class="ctl">' + g.emoji + ' ' + g.label +
          '</span><span class="ctb">' + (n ? '▮'.repeat(n) : '<i>还没有</i>') +
          '</span><span class="ctn">' + n + '</span></div>';
      }).join('');
    }

    let left = q.items.length;
    q.items.forEach(function (it) {
      const d = el('button', 'count-item', it.emoji);
      d.addEventListener('click', function () {
        if (d.classList.contains('done')) return;
        d.classList.add('done');
        tally[it.emoji]++;
        left--;
        Sfx().tick();
        renderTable();
        if (left === 0) setTimeout(function () { done(true); }, 650);
      });
      area.appendChild(d);
    });

    scene.appendChild(area);
    scene.appendChild(el('div', 'drag-hint', '每点一个，下面的数量就加 1'));
    scene.appendChild(table);
    renderTable();
    root.appendChild(scene);
  }

  /* ================= 玩法 E：搭配连线 ================= */
  /* q = { prompt, left:[{emoji,label}], right:[{emoji,label}] } */
  function buildLink(q, root, done) {
    const scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    const board = el('div', 'link-board');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'link-svg');
    board.appendChild(svg);
    const colL = el('div', 'link-col'), colR = el('div', 'link-col');

    const total = q.left.length * q.right.length;
    let count = 0;
    const made = {};
    const countEl = el('div', 'link-count', '已连 0 / ' + total);

    function drawLine(a, b) {
      const br = board.getBoundingClientRect();
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.right - br.left, y1 = ra.top + ra.height / 2 - br.top;
      const x2 = rb.left - br.left, y2 = rb.top + rb.height / 2 - br.top;
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
      ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      ln.setAttribute('class', 'link-line');
      svg.appendChild(ln);
      // 两端补圆点，让「确实连上了」一眼可见
      [[x1, y1], [x2, y2]].forEach(function (pt) {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', pt[0]); c.setAttribute('cy', pt[1]); c.setAttribute('r', 6);
        c.setAttribute('class', 'link-node');
        svg.appendChild(c);
      });
      if (countEl) countEl.textContent = '已连 ' + count + ' / ' + total;
    }

    function makeCard(it, side, idx) {
      const card = el('div', 'link-card', '<span class="lc-emoji">' + it.emoji +
        '</span><span class="lc-label">' + it.label + '</span>');
      card.dataset.side = side;
      card.dataset.idx = String(idx);
      card.dataset.key = side + idx;
      dragify(card, {
        near: '.link-card',
        onDrop: function (node, target) {
          const other = target && target.closest ? target.closest('.link-card') : null;
          if (!other || other.dataset.side === side) { shake(node); return; }
          const key = node.dataset.key + '-' + other.dataset.key;
          if (made[key]) { shake(node); Sfx().bad(); return; }   // 重复连线不计
          made[key] = 1;
          count++;
          drawLine(node, other);
          const dot = el('span', 'link-dot', '●');
          other.appendChild(dot);
          other.classList.add('linked');
          node.classList.add('linked');
          Sfx().tick();
          if (count === total) setTimeout(function () { done(true); }, 600);
        }
      });
      return card;
    }

    q.left.forEach(function (it, i) { colL.appendChild(makeCard(it, 'L', i)); });
    q.right.forEach(function (it, i) { colR.appendChild(makeCard(it, 'R', i)); });
    board.appendChild(colL);
    board.appendChild(colR);
    scene.appendChild(board);
    scene.appendChild(countEl);
    scene.appendChild(el('div', 'drag-hint', '左边每一件都要和右边连一次，共 ' + total + ' 种搭配'));
    root.appendChild(scene);
  }

  /* ================= 玩法 F：拖着排队 ================= */
  /* q = { prompt, people:[{emoji,name,rank}] }  rank 越大越高，要求从高到矮排 */
  function buildOrder(q, root, done) {
    const scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    const row = el('div', 'order-row');
    let arr = shuffleArr(q.people.slice());
    let finished = false;

    function check() {
      let ok = true;
      for (let i = 1; i < arr.length; i++) if (arr[i - 1].rank < arr[i].rank) { ok = false; break; }
      if (ok && !finished) { finished = true; Sfx().win(); setTimeout(function () { done(true); }, 550); }
      return ok;
    }

    function render() {
      row.innerHTML = '';
      arr.forEach(function (p) {
        // 注意：卡片不能有视觉高矮差异，否则孩子不推理、直接看高度就能排
        const card = el('div', 'order-card',
          '<span class="oc-emoji">' + p.emoji + '</span><span class="oc-name">' + p.name + '</span>');
        card.dataset.name = p.name;
        dragify(card, {
          near: '.order-card',
          onDrop: function (node, target) {
            if (finished) return;
            const other = target && target.closest ? target.closest('.order-card') : null;
            if (!other || other === node) return;
            const i1 = arr.map(function (x) { return x.name; }).indexOf(node.dataset.name);
            const i2 = arr.map(function (x) { return x.name; }).indexOf(other.dataset.name);
            if (i1 < 0 || i2 < 0) return;
            const t = arr[i1]; arr[i1] = arr[i2]; arr[i2] = t;
            Sfx().tick();
            render();
            check();
          }
        });
        row.appendChild(card);
      });
    }

    scene.appendChild(row);
    scene.appendChild(el('div', 'drag-hint', '拖着卡片互换位置，排好后会自动检查'));
    render();
    root.appendChild(scene);
  }

  /* ================= 对外接口 ================= */
  window.DragEngine = {
    mount: function (root, q, done) {
      root.innerHTML = '';
      if (q.type === 'classify') buildClassify(q, root, done);
      else if (q.type === 'pay') buildPay(q, root, done);
      else if (q.type === 'vfill') buildVfill(q, root, done);
      else if (q.type === 'count') buildCount(q, root, done);
      else if (q.type === 'link') buildLink(q, root, done);
      else if (q.type === 'order') buildOrder(q, root, done);
      else root.appendChild(el('div', 'drag-prompt', '（未知拖拽题型）'));
    },
    _shuffle: shuffleArr,
    _utils: { el: el, dragify: dragify, shake: shake, Sfx: Sfx }
  };
})();
