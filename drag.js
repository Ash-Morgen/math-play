/* 拖拽引擎 + 拖拽类玩法（操作型，替代「点选项」）
   设计要点：
   - Pointer Events 统一鼠标 / 触屏 / 触控笔
   - 拖动时把元素设成 pointer-events:none，松手用 elementFromPoint 命中落点
   - 松手判定放在 document 级监听，避免元素自身不接收事件
*/
(function () {
  'use strict';

  const Sfx = () => window.Sfx || { ok: function () { }, bad: function () { }, win: function () { } };

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
        if (opts.onDrop) opts.onDrop(node, target);
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  function shake(node) {
    node.classList.add('shake');
    setTimeout(function () { node.classList.remove('shake'); }, 430);
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
      const item = el('div', 'drag-item', it.emoji);
      item.dataset.group = it.group;
      dragify(item, {
        onDrop: function (node, target) {
          const bin = target && target.closest ? target.closest('.drag-bin') : null;
          if (bin && bin.dataset.accept === node.dataset.group) {
            // 放对：吸进筐里，锁定不可再拖
            node.dataset.locked = '1';
            node.classList.add('placed');
            bin.querySelector('.bin-items').appendChild(node);
            Sfx().ok();
            remaining--;
            if (remaining === 0) {
              setTimeout(function () { done(wrong <= 1); }, 420);
            }
          } else {
            // 放错：抖动 + 弹回原位
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
  /* q = { prompt, price, coins:[1,2,5,10], item } */
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
      var diff = counter.querySelector('.pc-diff');
      if (paid < q.price) { diff.textContent = '还差 ' + (q.price - paid) + ' 元'; diff.className = 'pc-diff need'; }
      else if (paid === q.price) { diff.textContent = '刚好！'; diff.className = 'pc-diff exact'; }
      else { diff.textContent = '多付了 ' + (paid - q.price) + ' 元'; diff.className = 'pc-diff over'; }
      if (paid === q.price) counter.classList.add('exact');
      else counter.classList.remove('exact');
      if (!settled && paid >= q.price) {
        settled = true;
        Sfx().win();
        const change = paid - q.price;
        const msg = el('div', 'pay-result ' + (change === 0 ? 'good' : 'warn'),
          change === 0 ? '✅ 刚好付清！' : '✅ 付清了，要找回 ' + change + ' 元');
        board.appendChild(msg);
        setTimeout(function () { done(wrong <= 1); }, 900);
      }
    }

    q.coins.forEach(function (v) {
      const coin = el('div', 'drag-item coin v' + v, v + '元');
      coin.dataset.v = String(v);
      dragify(coin, {
        onDrop: function (node, target) {
          const bin = target && target.closest ? target.closest('.drag-bin') : null;
          if (bin && bin.dataset.accept === 'money' && !settled) {
            // 钱币进收银台后「消失」（真实付款），只累计金额
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
            wrong++;   // 没拖到收银台
          }
        }
      });
      pool.appendChild(coin);
    });

    scene.appendChild(pool);
    root.appendChild(scene);
  }

  /* ================= 对外接口 ================= */
  window.DragEngine = {
    mount: function (root, q, done) {
      root.innerHTML = '';
      if (q.type === 'classify') buildClassify(q, root, done);
      else if (q.type === 'pay') buildPay(q, root, done);
      else root.appendChild(el('div', 'drag-prompt', '（未知拖拽题型）'));
    }
  };
})();
