/* 渐进提示引擎自测（hint.js）
   核心断言只有一条最重要：**提示不能泄题**。
   答错时给提示而不给答案，是本功能的设计前提（Bastani et al. 2025, PNAS：
   直接给答案 → 练习分 +48% 但期末 −17%；只给提示 → 练习 +127% 且期末不降）。
   如果提示文案里混进了答案，这个改造就白做了 —— 所以这里逐题扫描。

   同时检查：
   1) 每个玩法/难度的一级、二级提示都非空，且不含 undefined/NaN
   2) 提示不包含「答案」的任何形式（数字答案、座位号、每份数、价格…）
   3) reveal() 在需要揭晓时确实包含答案
   用法：node test_hint.js */
const fs = require('fs');
const H = require('./hint.js');

/* ---------- 抽取 grade2.js 的 MODES ---------- */
const src2 = fs.readFileSync(__dirname + '/grade2.js', 'utf8');
const a2 = src2.indexOf('const rnd');
const b2 = src2.indexOf('/* ================= 存储');
if (a2 < 0 || b2 < 0) { console.error('grade2.js 抽取失败'); process.exit(1); }
const { MODES } = new Function(src2.slice(a2, b2) + '\nreturn { MODES };')();

/* ---------- 抽取 app.js 的 LEVELS ---------- */
const srcA = fs.readFileSync(__dirname + '/app.js', 'utf8');
const aA = srcA.indexOf('const rnd');
const bA = srcA.indexOf('/* ================= 存储');
if (aA < 0 || bA < 0) { console.error('app.js 抽取失败'); process.exit(1); }
const { LEVELS } = new Function(srcA.slice(aA, bA) + '\nreturn { LEVELS };')();

const N = 400;
let checked = 0, bad = 0;
const errors = [];
function err(tag, msg) { errors.push('[' + tag + '] ' + msg); bad++; }

/* 一个题目里所有「不能出现在提示中」的答案形式 */
function protectedTokens(q) {
  const out = [];
  if (q.ans !== undefined && q.ans !== null && q.ans !== '') out.push(String(q.ans));
  if (q.answer !== undefined) out.push('第 ' + q.answer + ' 个', String(q.answer) + ' 个位置');
  if (q.per !== undefined) out.push('每份 ' + q.per, '放 ' + q.per + ' 个');
  if (q.price !== undefined) out.push(String(q.price) + ' 元');
  return out;
}

// 「含答案」判定要按数字边界来：提示里的「10」不该被当成答案「0」命中
function hits(h, tok) {
  const esc = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<![0-9])' + esc + '(?![0-9])').test(h);
}

function checkHint(tag, q, mode, level) {
  const h = H.text(q, mode, level);
  checked++;
  if (!h || h.length < 4) { err(tag, 'L' + level + ' 提示为空/过短: ' + JSON.stringify(h)); return; }
  if (/undefined|NaN|\[object/.test(h)) { err(tag, 'L' + level + ' 提示含非法值: ' + h); }
  protectedTokens(q).forEach((tok) => {
    if (tok && h.indexOf(tok) >= 0) {
      err(tag, 'L' + level + ' 提示泄题：含「' + tok + '」→ ' + h);
    }
  });
}

/* ---------- 1. 二上闯关 ---------- */
for (const m of MODES) {
  if (m.kind === 'match' || m.kind === 'mine') continue;   // 限时玩法不走提示流程
  const tag = m.id;
  const l1s = new Set(), l2s = new Set();
  for (let i = 0; i < N; i++) {
    let q;
    try { q = m.gen(); } catch (e) { err(tag, 'gen 抛异常: ' + e.message); break; }
    for (const lv of [1, 2]) {
      const h = H.text(q, m, lv);
      if (!h || h.length < 4) err(tag, 'L' + lv + ' 提示为空: ' + JSON.stringify(h));
      if (/undefined|NaN|\[object/.test(h)) err(tag, 'L' + lv + ' 提示含非法值: ' + h);
      protectedTokens(q).forEach((tok) => {
        if (tok && hits(h, tok)) err(tag, 'L' + lv + ' 提示泄题：含「' + tok + '」→ ' + h);
      });
      checked++;
      if (lv === 1) l1s.add(h); else l2s.add(h);
    }
    // 揭晓语必须给出答案
    const rv = H.reveal(q, m);
    if (!rv || rv.length < 4) err(tag, '揭晓语为空');
    checked++;
  }
  // 提示必须有变化（不是所有题一句废话）
  if (l1s.size === 1 && l2s.size === 1 && l1s.values().next().value === l2s.values().next().value) {
    err(tag, 'L1 与 L2 提示完全相同，没有递进');
  }
}

/* ---------- 2. 数感训练（C/P/A 三档 × 3 难度） ---------- */
const cpaFor = (idx) => (idx < 3 ? 'C' : idx < 6 ? 'P' : 'A');
for (const lv of LEVELS) {
  const tag = 'app-L' + lv.id;
  for (let i = 0; i < N; i++) {
    const q = lv.gen();
    q.idx = i % 10;
    q.cpa = cpaFor(q.idx);
    for (const l of [1, 2]) {
      const h = H.text(q, lv, l);
      checked++;
      if (!h || h.length < 4) err(tag, 'L' + l + ' 提示为空');
      if (/undefined|NaN|\[object/.test(h)) err(tag, 'L' + l + ' 提示含非法值: ' + h);
      // 数感训练的答案就是 ans
      if (hits(h, String(q.ans))) err(tag, 'L' + l + ' 提示泄题：含「' + q.ans + '」→ ' + h);
    }
    const rv = H.reveal(q, lv);
    checked++;
    if (rv.indexOf(String(q.ans)) < 0) err(tag, '揭晓语没有答案: ' + rv);
  }
}

/* ---------- 3. 兜底路径：未知题型也不能崩 ---------- */
const weird = [
  [{ prompt: '???', kind: 'drag', type: 'nosuchtype', ans: 7 }, { id: 'nosuchmode', unit: 'x' }],
  [{ prompt: '???', options: ['a', 'b', 'c'], ans: 'b' }, { id: 'nosuchmode2', unit: 'x' }],
  [null, null]
];
weird.forEach((pair, i) => {
  try {
    const h = H.text(pair[0], pair[1], 1);
    if (!h || h.length < 4) err('fallback' + i, '兜底提示为空');
    checked++;
  } catch (e) { err('fallback' + i, '兜底抛异常: ' + e.message); }
  try { H.reveal(pair[0], pair[1]); checked++; }
  catch (e) { err('fallback' + i, 'reveal 抛异常: ' + e.message); }
});

/* ---------- 汇总 ---------- */
const skipTypes = new Set(['match', 'mine']);
const nMode = MODES.filter((m) => !skipTypes.has(m.kind)).length + LEVELS.length;
console.log(`覆盖玩法: ${nMode}（二上闯关 ${nMode - LEVELS.length} + 数感训练 ${LEVELS.length}）`);
console.log(`抽查断言: ${checked} 条`);
if (bad) {
  console.log(`\n❌ ${bad} 处问题（去重前 15 条）：`);
  [...new Set(errors)].slice(0, 15).forEach((e) => console.log('  ' + e));
  process.exit(1);
} else {
  console.log('\n✅ 全部通过（无泄题、无空提示、揭晓语含答案）');
}

console.log('\n--- 提示样例（交替展示 L1 / L2）---');
const samples = [
  ['v-carry', 0], ['v-carry', 1], ['balance-add', 0], ['mul-names', 0],
  ['mul-names', 1], ['reasoning', 0], ['rmb-conv', 1], ['direction', 1]
];
samples.forEach(([id, lv]) => {
  const m = MODES.find((x) => x.id === id);
  if (!m) return;
  const q = m.gen();
  console.log(`\n【${m.name} · L${lv + 1}】${m.prompt ? '' : ''}`);
  console.log('  题目: ' + String(q.prompt || '').replace(/<br>/g, ' / ').slice(0, 60));
  console.log('  提示: ' + H.text(q, m, lv + 1));
});
console.log('\n--- 数感训练提示样例 ---');
[0, 3, 8].forEach((idx) => {
  LEVELS.forEach((lv) => {
    const q = lv.gen(); q.idx = idx; q.cpa = cpaFor(idx);
    if (lv.id !== 3 && idx !== 8) return;
    console.log(`\n【${lv.name} · ${q.cpa}】${q.a} ${q.op} ${q.b} = ?（答案 ${q.ans}）`);
    console.log('  L1: ' + H.text(q, lv, 1));
    console.log('  L2: ' + H.text(q, lv, 2));
  });
});
