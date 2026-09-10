/* 题目生成器自测
   1) 选择题：每题必须含正确答案、选项不重复、无 NaN
   2) 拖拽题：结构完整，且「付钱」题的钱币必须能凑出价格（否则玩家卡死）
   用法：node test_modes.js */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/grade2.js', 'utf8');

const a = src.indexOf('const rnd');
const b = src.indexOf('/* ================= 存储');
if (a < 0 || b < 0) { console.error('抽取失败'); process.exit(1); }
const { MODES } = new Function(src.slice(a, b) + '\nreturn { MODES };')();

const N = 300;
let total = 0, bad = 0, dragCount = 0;
const errors = [];

// 子集和：给定的钱币能否刚好凑出目标（玩家必须能通关）
function canMake(coins, target) {
  for (let mask = 1; mask < (1 << coins.length); mask++) {
    let s = 0;
    for (let i = 0; i < coins.length; i++) if (mask & (1 << i)) s += coins[i];
    if (s === target) return true;
  }
  return false;
}

for (const m of MODES) {
  for (let i = 0; i < N; i++) {
    total++;
    let q;
    try { q = m.gen(); }
    catch (e) { errors.push(`[${m.id}] gen 抛异常: ${e.message}`); bad++; continue; }

    /* ---------- 拖拽题 ---------- */
    if (m.kind === 'drag') {
      dragCount++;
      if (q.kind !== 'drag') errors.push(`[${m.id}] 未返回 kind:drag`), bad++;
      if (!q.prompt) errors.push(`[${m.id}] 缺 prompt`), bad++;

      if (q.type === 'classify') {
        if (!q.items || !q.items.length) errors.push(`[${m.id}] items 为空`), bad++;
        if (!q.bins || q.bins.length < 2) errors.push(`[${m.id}] bins 少于 2 个`), bad++;
        q.items.forEach((it) => {
          if (!it.emoji || !it.group) errors.push(`[${m.id}] item 字段缺失`), bad++;
          if (!q.bins.some((b) => b.accept === it.group))
            errors.push(`[${m.id}] 物体 group=${it.group} 没有对应筐（无法完成）`), bad++;
        });
        q.bins.forEach((bn) => {
          if (!bn.label || !bn.accept) errors.push(`[${m.id}] bin 字段缺失`), bad++;
        });
        // 每个筐至少要有一个可放进去的物体，否则是死筐
        q.bins.forEach((bn) => {
          if (!q.items.some((it) => it.group === bn.accept))
            errors.push(`[${m.id}] 筐「${bn.label}」没有可放的物体`), bad++;
        });
      } else if (q.type === 'pay') {
        if (!(q.price > 0)) errors.push(`[${m.id}] price 非法: ${q.price}`), bad++;
        if (!q.coins || !q.coins.length) errors.push(`[${m.id}] coins 为空`), bad++;
        if (q.coins.some((c) => !(c > 0))) errors.push(`[${m.id}] 存在非正币值`), bad++;
        if (!canMake(q.coins, q.price))
          errors.push(`[${m.id}] price=${q.price} 无法用 [${q.coins.join(',')}] 凑出 → 玩家会卡住`), bad++;
      } else {
        errors.push(`[${m.id}] 未知拖拽类型: ${q.type}`), bad++;
      }
      continue;
    }

    /* ---------- 选择题 ---------- */
    const opts = (q.options || []).map(String);
    const ans = String(q.ans);
    if (opts.length < 3 || opts.length > 4) errors.push(`[${m.id}] 选项数 ${opts.length}: ${opts.join(' | ')}`), bad++;
    if (opts.indexOf(ans) < 0) errors.push(`[${m.id}] 不含正确答案 ans=${ans}，选项=${opts.join(' | ')}`), bad++;
    if (new Set(opts).size !== opts.length) errors.push(`[${m.id}] 选项有重复: ${opts.join(' | ')}`), bad++;
    if (/undefined|NaN|"null"/.test(JSON.stringify(q))) errors.push(`[${m.id}] 含非法值`), bad++;
    if (!q.prompt || q.prompt.length < 5) errors.push(`[${m.id}] prompt 异常`), bad++;
  }
}

const choiceCount = MODES.length - MODES.filter((m) => m.kind === 'drag').length;
console.log(`模式数: ${MODES.length}（选择题 ${choiceCount} · 拖拽题 ${MODES.filter((m) => m.kind === 'drag').length}）`);
console.log(`样本: ${total} 题`);
if (bad) {
  console.log(`\n❌ ${bad} 处问题（去重展示前 12 条）：`);
  [...new Set(errors)].slice(0, 12).forEach((e) => console.log('  ' + e));
  process.exit(1);
} else {
  console.log('\n✅ 全部通过');
}

console.log('\n--- 各模式样题 ---');
for (const m of MODES) {
  const q = m.gen();
  console.log(`${m.unit} | ${m.name}${m.kind === 'drag' ? '  【拖拽】' : ''}`);
  if (m.kind === 'drag') {
    console.log(`   ${q.prompt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)}`);
    if (q.type === 'classify') {
      console.log(`   物体: ${q.items.map((i) => i.emoji).join(' ')}`);
      console.log(`   筐: ${q.bins.map((b) => b.label).join(' / ')}`);
    } else {
      console.log(`   价格: ${q.price} 元　钱币: ${q.coins.join(' / ')} 元`);
      console.log(`   可凑出价格: ${canMake(q.coins, q.price) ? '是' : '否 ❌'}`);
    }
  } else {
    const plain = q.prompt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 56);
    console.log(`   ${plain}`);
    console.log(`   选项: ${q.options.join(' / ')}   答案: ${q.ans}`);
  }
}
