/* 题目生成器自测
   1) 选择题：每题必须含正确答案、选项不重复、无 NaN
   2) 拖拽题：
      - classify：物体都有对应筐、无死筐
      - pay：钱币必须能凑出价格（否则玩家卡死）
      - vfill：隐藏位的正确数字必须等于 ans、竖式必须成立、数字块含答案
      - count：统计项必须与实际水果种类一致
   3) 消除题（kind:'match'）：由 test_match.js 覆盖，这里跳过
   用法：node test_modes.js */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/grade2.js', 'utf8');
const a = src.indexOf('const rnd');
const b = src.indexOf('/* ================= 存储');
if (a < 0 || b < 0) { console.error('抽取失败'); process.exit(1); }
const { MODES } = new Function(src.slice(a, b) + '\nreturn { MODES };')();

const N = 300;
let total = 0, bad = 0;
const errors = [];

function canMake(coins, target) {
  for (let mask = 1; mask < (1 << coins.length); mask++) {
    let s = 0;
    for (let i = 0; i < coins.length; i++) if (mask & (1 << i)) s += coins[i];
    if (s === target) return true;
  }
  return false;
}
function err(m, msg) { errors.push(`[${m.id}] ${msg}`); bad++; }

for (const m of MODES) {
  if (m.kind === 'match') continue;                       // 消除玩法另测
  for (let i = 0; i < N; i++) {
    total++;
    let q;
    try { q = m.gen(); }
    catch (e) { err(m, 'gen 抛异常: ' + e.message); continue; }

    /* ---------- 拖拽题 ---------- */
    if (m.kind === 'drag') {
      if (q.kind !== 'drag') err(m, '未返回 kind:drag');
      if (!q.prompt) err(m, '缺 prompt');

      if (q.type === 'classify') {
        if (!q.items || !q.items.length) err(m, 'items 为空');
        if (!q.bins || q.bins.length < 2) err(m, 'bins 少于 2 个');
        q.items.forEach((it) => {
          if (!it.emoji || !it.group) err(m, 'item 字段缺失');
          if (!q.bins.some((bn) => bn.accept === it.group)) err(m, `物体 group=${it.group} 没有对应筐`);
        });
        q.bins.forEach((bn) => {
          if (!bn.label || !bn.accept) err(m, 'bin 字段缺失');
          if (!q.items.some((it) => it.group === bn.accept)) err(m, `筐「${bn.label}」是死筐`);
        });

      } else if (q.type === 'pay') {
        if (!(q.price > 0)) err(m, 'price 非法: ' + q.price);
        if (!q.coins || !q.coins.length) err(m, 'coins 为空');
        if (q.coins.some((c) => !(c > 0))) err(m, '存在非正币值');
        if (!canMake(q.coins, q.price)) err(m, `price=${q.price} 无法用 [${q.coins.join(',')}] 凑出`);

      } else if (q.type === 'vfill') {
        // 竖式必须成立
        const okMath = q.op === '+' ? (q.a + q.b === q.c) : (q.a - q.b === q.c);
        if (!okMath) err(m, `竖式不成立: ${q.a} ${q.op} ${q.b} ≠ ${q.c}`);
        // hide 格式
        const prefix = q.hide[0], pos = Number(q.hide.slice(1));
        if ('abc'.indexOf(prefix) < 0 || !(pos >= 0 && pos <= 1)) err(m, 'hide 格式异常: ' + q.hide);
        // 关键：隐藏位的真实数字必须等于 ans，否则题目无解
        const s = { a: String(q.a), b: String(q.b), c: String(q.c) }[prefix];
        const realDigit = Number(s[s.length - 1 - pos]);
        if (realDigit !== q.ans) err(m, `隐藏位 ${q.hide} 真实是 ${realDigit}，但 ans=${q.ans}`);
        // 数字块
        if (q.digits.indexOf(q.ans) < 0) err(m, '数字块不含正确答案');
        if (new Set(q.digits).size !== q.digits.length) err(m, '数字块有重复');
        if (q.digits.length < 3) err(m, '数字块少于 3 个');

      } else if (q.type === 'count') {
        if (!q.items || !q.items.length) err(m, 'items 为空');
        if (!q.groups || !q.groups.length) err(m, 'groups 为空');
        const kinds = new Set(q.items.map((it) => it.emoji));
        q.groups.forEach((g) => {
          if (!g.emoji || !g.label) err(m, 'group 字段缺失');
          if (!kinds.has(g.emoji)) err(m, `统计项「${g.label}」没有任何水果`);
        });
        if (kinds.size !== q.groups.length) err(m, 'items 种类数与 groups 不一致');
        if (q.items.length < 6) err(m, '水果太少（' + q.items.length + '）');

      } else if (q.type === 'link') {
        if (!q.left || q.left.length < 2) err(m, 'left 少于 2 件');
        if (!q.right || q.right.length < 2) err(m, 'right 少于 2 条');
        const totalLine = q.left.length * q.right.length;
        if (totalLine < 2 || totalLine > 9) err(m, '连线数不合理: ' + totalLine);
        q.left.concat(q.right).forEach((it) => {
          if (!it.emoji || !it.label) err(m, 'link 项字段缺失');
        });
        // 同一侧标签重名会导致玩家无法分辨该连哪条
        const lt = q.left.map((x) => x.label), rt = q.right.map((x) => x.label);
        if (new Set(lt).size !== lt.length) err(m, '左侧标签有重复: ' + lt.join(','));
        if (new Set(rt).size !== rt.length) err(m, '右侧标签有重复: ' + rt.join(','));

      } else if (q.type === 'order') {
        if (!q.people || q.people.length < 3) err(m, '人少于 3 个');
        q.people.forEach((p) => {
          if (!p.name || !p.rank) err(m, 'people 字段缺失');
        });
        const ranks = q.people.map((p) => p.rank);
        // rank 重复 → 有并列，正确答案不唯一，孩子会被判错
        if (new Set(ranks).size !== ranks.length) err(m, 'rank 有重复 → 答案不唯一: ' + ranks.join(','));
        // 线索必须恰好对应唯一排序（相邻比较链）
        const sorted = q.people.slice().sort((x, y) => y.rank - x.rank);
        const expect = sorted.slice(0, -1).map((pp, i) => pp.name + ' 比 ' + sorted[i + 1].name + ' 高').join('<br>');
        if (q.prompt.indexOf(expect) < 0) err(m, '线索与唯一解不符');

      } else if (q.type === 'maze') {
        if (!(q.size >= 3 && q.size <= 8)) err(m, 'size 不合理: ' + q.size);
        const okPos = (pt) => pt && pt.r >= 0 && pt.r < q.size && pt.c >= 0 && pt.c < q.size;
        if (!okPos(q.start)) err(m, 'start 越界');
        if (!okPos(q.goal)) err(m, 'goal 越界');
        if (q.start.r === q.goal.r && q.start.c === q.goal.c) err(m, '起点就是终点');
        const dist = Math.abs(q.start.r - q.goal.r) + Math.abs(q.start.c - q.goal.c);
        if (dist < 2) err(m, '起点离终点太近（' + dist + ' 步）');

      } else if (q.type === 'place') {
        if (!q.items || q.items.length < 2) err(m, '地点少于 2 个');
        const DIRS4 = ['\u5317', '\u4e1c', '\u5357', '\u897f'];
        const used = [];
        q.items.forEach((it) => {
          if (!it.emoji || !it.label) err(m, 'place 项字段缺失');
          if (DIRS4.indexOf(it.dir) < 0) err(m, '方向非法: ' + it.dir);
          if (used.indexOf(it.dir) >= 0) err(m, '方向重复（两个地点挤同一格）: ' + it.dir);
          used.push(it.dir);
        });

      } else if (q.type === 'seat') {
        if (!q.person || !q.person.name) err(m, 'person 缺失');
        if (!(q.slots >= 3 && q.slots <= 8)) err(m, 'slots 不合理: ' + q.slots);
        if (!(q.answer >= 1 && q.answer <= q.slots)) err(m, 'answer 越界: ' + q.answer + '/' + q.slots);

      } else if (q.type === 'group') {
        if (!(q.boxes >= 2 && q.boxes <= 5)) err(m, 'boxes 不合理: ' + q.boxes);
        if (!(q.total >= 4 && q.total <= 20)) err(m, 'total 不合理: ' + q.total);
        if (q.total % q.boxes !== 0) err(m, 'total 不能被 boxes 整除: ' + q.total + '/' + q.boxes);
        if (q.total / q.boxes < 2) err(m, '每盘只有 ' + (q.total / q.boxes) + ' 个，太简单');
        if (!q.emoji) err(m, 'emoji 缺失');

      } else {
        err(m, '未知拖拽类型: ' + q.type);
      }
      continue;
    }

    /* ---------- 选择题 ---------- */
    const opts = (q.options || []).map(String);
    const ans = String(q.ans);
    if (opts.length < 3 || opts.length > 4) err(m, `选项数 ${opts.length}: ${opts.join(' | ')}`);
    if (opts.indexOf(ans) < 0) err(m, `不含正确答案 ans=${ans}，选项=${opts.join(' | ')}`);
    if (new Set(opts).size !== opts.length) err(m, '选项有重复: ' + opts.join(' | '));
    if (/undefined|NaN|"null"/.test(JSON.stringify(q))) err(m, '含非法值');
    if (!q.prompt || q.prompt.length < 5) err(m, 'prompt 异常');
  }
}

const nChoice = MODES.filter((m) => !m.kind).length;
const nDrag = MODES.filter((m) => m.kind === 'drag').length;
const nMatch = MODES.filter((m) => m.kind === 'match').length;
console.log(`模式数: ${MODES.length}（选择 ${nChoice} · 拖拽 ${nDrag} · 消除 ${nMatch}）`);
console.log(`抽查样本: ${total} 题`);
if (bad) {
  console.log(`\n❌ ${bad} 处问题（去重前 12 条）：`);
  [...new Set(errors)].slice(0, 12).forEach((e) => console.log('  ' + e));
  process.exit(1);
} else {
  console.log('\n✅ 全部通过');
}

console.log('\n--- 新增拖拽题样题 ---');
for (const m of MODES.filter((x) => x.kind === 'drag' && ['vfill', 'count'].indexOf(x.gen().type) >= 0).slice(0, 6)) {
  const q = m.gen();
  console.log(`${m.name}`);
  if (q.type === 'vfill') {
    const fmt = (v, p) => String(v).split('').map((ch, i) => {
      const key = p + (String(v).length - 1 - i);
      return key === q.hide ? '[?]' : ch;
    }).join('');
    console.log(`   ${fmt(q.a, 'a')}`);
    console.log(`   ${q.op} ${fmt(q.b, 'b')}`);
    console.log(`   -----`);
    console.log(`   ${fmt(q.c, 'c')}     数字块: ${q.digits.join(' ')}  答案: ${q.ans}`);
  } else {
    console.log(`   ${q.prompt}`);
    console.log(`   水果: ${q.items.map((i) => i.emoji).join('')}`);
    console.log(`   统计项: ${q.groups.map((g) => g.label).join(' / ')}`);
  }
}
