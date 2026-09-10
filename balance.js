/* 数字天平 · 等式概念玩法
   左盘放算式，右盘拖数字，拖对了天平才平衡。
   拖错会真的倾斜（大了往右沉、小了往左沉），孩子能自己判断偏大偏小。

   q = { prompt, leftText, ans, options:[...] }
*/
(function () {
  'use strict';
  var D = window.DragEngine;
  if (!D || !D._utils) { console.error('balance.js 需要先加载 drag.js'); return; }
  var U = D._utils;
  var el = U.el, dragify = U.dragify, shake = U.shake, Sfx = U.Sfx;

  function buildBalance(q, root, done) {
    var scene = el('div', 'drag-scene');
    scene.appendChild(el('div', 'drag-prompt', q.prompt));

    var rig = el('div', 'bal-rig');
    rig.innerHTML =
      '<div class="bal-beam">' +
        '<div class="bal-hang"><i class="bal-rope"></i>' +
          '<div class="bal-pan"><span class="bal-expr">' + q.leftText + '</span></div></div>' +
        '<div class="bal-hang"><i class="bal-rope"></i>' +
          '<div class="bal-pan"><span class="bal-slot" data-slot="ans">?</span></div></div>' +
        '<div class="bal-post"></div>' +
      '</div>';
    scene.appendChild(rig);

    var beam = rig.querySelector('.bal-beam');
    var slot = rig.querySelector('.bal-slot');
    var hint = el('div', 'bal-hint', '把数字拖到右盘，让天平平衡');
    var pool = el('div', 'drag-pool');
    var wrong = 0, solved = false;

    function tilt(deg) {
      beam.style.transform = 'rotate(' + deg + 'deg)';
    }

    q.options.forEach(function (v) {
      var chip = el('div', 'drag-item bal-chip', String(v));
      chip.setAttribute('data-val', String(v));
      dragify(chip, {
        near: '.bal-slot',
        onDrop: function (node, target) {
          var s2 = target && target.closest ? target.closest('.bal-slot') : null;
          if (!s2 || solved) { shake(node); return; }
          var val = Number(node.getAttribute('data-val'));

          slot.textContent = String(val);
          slot.classList.add('filled');

          if (val === q.ans) {
            solved = true;
            tilt(0);
            hint.textContent = '\u2705 \u5E73\u8861\u4E86\uFF01' + q.leftText + ' = ' + q.ans;
            hint.className = 'bal-hint good';
            node.setAttribute('data-locked', '1');
            node.classList.add('placed');
            Sfx().ok();
            setTimeout(function () { done(wrong <= 1); }, 780);
          } else {
            // 关键：立刻按「偏大/偏小」倾斜，让孩子自己看出方向
            wrong++;
            tilt(val > q.ans ? 9 : -9);
            hint.textContent = val > q.ans
              ? '\u53F3\u8FB9\u592A\u91CD\u4E86\uFF08' + val + ' \u504F\u5927\uFF09\uFF0C\u518D\u60F3\u60F3'
              : '\u53F3\u8FB9\u592A\u8F7B\u4E86\uFF08' + val + ' \u504F\u5C0F\uFF09\uFF0C\u518D\u60F3\u60F3';
            hint.className = 'bal-hint bad';
            Sfx().bad();
            shake(node);
            setTimeout(function () {
              slot.textContent = '?';
              slot.classList.remove('filled');
              tilt(0);
            }, 1300);
          }
        }
      });
      pool.appendChild(chip);
    });

    scene.appendChild(pool);
    scene.appendChild(hint);
    root.appendChild(scene);
  }

  var orig = D.mount;
  D.mount = function (root, q, done) {
    if (q.type === 'balance') return buildBalance(q, root, done);
    return orig(root, q, done);
  };
})();
