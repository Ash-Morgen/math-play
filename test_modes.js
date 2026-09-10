/* 题目生成器自测：把 grade2.js 的 MODES 抽出来跑大量随机样本，
   检查每题是否都含正确答案、选项是否重复、有无 NaN/undefined。
   用法：node test_modes.js */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/grade2.js', 'utf8');

// 抽取：从工具函数开始，到「存储」段之前（避开 DOM 相关代码）
const a = src.indexOf('const rnd');
const b = src.indexOf('/* ================= 存储');
if (a < 0 || b < 0) { console.error('抽取失败'); process.exit(1); }
const code = src.slice(a, b);

const factory = new Function(code + '\nreturn { MODES };');
const { MODES } = factory();

const N = 300;
let total = 0, bad = 0;
const errors = [];

for (const m of MODES) {
  for (let i = 0; i < N; i++) {
    total++;
    let q;
    try { q = m.gen(); }
    catch (e) { errors.push(`[${m.id}] gen 抛异常: ${e.message}`); bad++; continue; }

    const opts = (q.options || []).map(String);
    const ans = String(q.ans);
    const s = JSON.stringify(q);

    if (opts.length < 3 || opts.length > 4) errors.push(`[${m.id}] 选项数 ${opts.length}: ${opts.join(' | ')}`), bad++;
    if (opts.indexOf(ans) < 0) errors.push(`[${m.id}] 不含正确答案 ans=${ans}，选项=${opts.join(' | ')}`), bad++;
    if (new Set(opts).size !== opts.length) errors.push(`[${m.id}] 选项有重复: ${opts.join(' | ')}`), bad++;
    if (/undefined|NaN|"null"/.test(s)) errors.push(`[${m.id}] 含非法值: ${s.slice(0, 220)}`), bad++;
    if (!q.prompt || q.prompt.length < 5) errors.push(`[${m.id}] prompt 异常`), bad++;
    if (/<div class="ask">\s*<\/div>/.test(q.prompt)) errors.push(`[${m.id}] 题目文字为空`), bad++;
  }
}

console.log(`模式数: ${MODES.length}　样本: ${total} 题`);
if (bad) {
  console.log(`\n❌ 发现 ${bad} 处问题（去重后展示前 12 条）：`);
  [...new Set(errors)].slice(0, 12).forEach((e) => console.log('  ' + e));
  process.exit(1);
} else {
  console.log('\n✅ 全部通过：每题都有 3-4 个不重复选项且必含正确答案');
}

// 顺带展示每个模式一道样题（便于人工确认题目合理）
console.log('\n--- 各模式样题 ---');
for (const m of MODES) {
  const q = m.gen();
  const plain = q.prompt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 56);
  console.log(`${m.unit} | ${m.name}`);
  console.log(`   ${plain}`);
  console.log(`   选项: ${q.options.join(' / ')}   答案: ${q.ans}`);
}
