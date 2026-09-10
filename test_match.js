/* 乘法消除玩法自测
   1) 值集自洽：每个数字都必须能被凑出（否则成死块）
   2) 判定正确性：a×b=c 的各种排列
   3) 棋盘初始必有解
   4) 模拟整局：反复消除 + 补块，检查不会卡死
   用法：node test_match.js */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/match.js', 'utf8');
const a = src.indexOf('const EMPTY');
const b = src.indexOf('/* ================= UI');
if (a < 0 || b < 0) { console.error('抽取失败'); process.exit(1); }
const L = new Function(src.slice(a, b) +
  '\nreturn {buildValueSet,evaluateTriple,modClear,makeGrid,findTriple,refill,starOf,EMPTY,MAX_RANDOM_CLEAR};')();
const { buildValueSet, evaluateTriple, modClear, makeGrid, findTriple, refill, starOf, EMPTY } = L;

let bad = 0;
const LEVELS = [
  { lo: 2, hi: 6, mv: 36, label: '2~6 口诀' },
  { lo: 7, hi: 9, mv: 81, label: '7~9 口诀' },
  { lo: 2, hi: 9, mv: 81, label: '全口诀' },
];

/* ---- 1) 值集自洽 ---- */
console.log('=== 1) 值集自洽性 ===');
for (const lv of LEVELS) {
  const vs = buildValueSet(lv.lo, lv.hi, lv.mv);
  const orphans = vs.filter((v) => {
    if (lv.lo <= v && v <= lv.hi) return false;          // 因数本身可用
    for (let x = lv.lo; x <= lv.hi; x++)
      for (let y = lv.lo; y <= lv.hi; y++) if (x * y === v) return false;
    return true;                                          // 凑不出来 → 死块
  });
  if (orphans.length) { console.log(`  ❌ ${lv.label}: 死块 ${orphans.join(',')}`); bad++; }
  else console.log(`  ✅ ${lv.label}: ${vs.length} 个数全部可凑出  [${vs.join(' ')}]`);
}

/* ---- 2) 判定正确性 ---- */
console.log('\n=== 2) 算式判定 ===');
const CASES = [
  [[2, 3, 6], true, '2×3=6'], [[3, 2, 6], true, '顺序无关'],
  [[6, 2, 3], true, '结果在首位'], [[2, 2, 4], true, '两个因数相同'],
  [[9, 9, 81], true, '9×9'], [[7, 8, 56], true, '7×8'],
  [[2, 3, 5], false, '加法不算乘法'], [[1, 5, 5], false, '1 不算因数'],
  [[7, 8, 9], false, '无关系'], [[4, 4, 16], true, '4×4'],
];
for (const [nums, expect, label] of CASES) {
  const got = !!evaluateTriple(nums);
  if (got !== expect) { console.log(`  ❌ ${label}: [${nums}] 期望 ${expect} 得到 ${got}`); bad++; }
  else console.log(`  ✅ ${label}: [${nums.join(',')}] → ${got ? '成立' : '不成立'}`);
}

/* ---- 3) 追加消除数 ---- */
console.log('\n=== 3) 追加消除数（结果的十位数）===');
const MODS = [[6, 0], [9, 0], [12, 1], [20, 2], [36, 3], [81, 8]];
for (const [n, expect] of MODS) {
  const got = modClear(n);
  if (got !== expect) { console.log(`  ❌ ${n} → ${got}，期望 ${expect}`); bad++; }
  else console.log(`  ✅ ${n} → 追加消 ${got} 块`);
}

/* ---- 4) 棋盘初始必有解 ---- */
console.log('\n=== 4) 棋盘初始必有解（各 200 次）===');
for (const lv of LEVELS) {
  const vs = buildValueSet(lv.lo, lv.hi, lv.mv);
  let noSolve = 0;
  for (let t = 0; t < 200; t++) {
    let g = makeGrid(8, 6, vs), guard = 0;
    while (!findTriple(g, 8, 6, vs) && guard++ < 60) g = makeGrid(8, 6, vs);
    if (!findTriple(g, 8, 6, vs)) noSolve++;
  }
  if (noSolve) { console.log(`  ❌ ${lv.label}: ${noSolve}/200 次无解`); bad++; }
  else console.log(`  ✅ ${lv.label}: 200/200 均有解`);
}

/* ---- 5) 模拟整局：消除→补块→再消除，检查不卡死 ---- */
console.log('\n=== 5) 模拟整局（各 60 局 × 每局 40 步）===');
for (const lv of LEVELS) {
  const vs = buildValueSet(lv.lo, lv.hi, lv.mv);
  let deadLocks = 0, totalSteps = 0, score = 0, matched = 0;
  for (let t = 0; t < 60; t++) {
    let g = makeGrid(8, 6, vs), guard = 0;
    while (!findTriple(g, 8, 6, vs) && guard++ < 60) g = makeGrid(8, 6, vs);
    for (let k = 0; k < 40; k++) {
      let tri = findTriple(g, 8, 6, vs);
      if (!tri) {
        // 真实玩法里会重排兜底；这里检查重排能否恢复（重排后必须重新取三元组）
        let g2 = 0;
        while (!tri && g2++ < 40) {
          for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) g[r][c] = vs[(Math.random() * vs.length) | 0];
          tri = findTriple(g, 8, 6, vs);
        }
        if (!tri) { deadLocks++; break; }
      }
      const res = evaluateTriple(tri.map((x) => x.v));
      if (!res) { console.log('  ❌ 找到的三元组竟然判定不成立'); bad++; break; }
      score += res.c; matched++; totalSteps++;
      tri.forEach((x) => { g[x.r][x.c] = EMPTY; });
      // 追加消除
      const extra = Math.min(modClear(res.c), L.MAX_RANDOM_CLEAR);
      const pool = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) if (g[r][c] !== EMPTY) pool.push({ r, c });
      for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
      pool.slice(0, extra).forEach((p) => { g[p.r][p.c] = EMPTY; });
      refill(g, 8, 6, vs);
    }
  }
  if (deadLocks) { console.log(`  ❌ ${lv.label}: ${deadLocks} 局出现无法恢复的死局`); bad++; }
  else console.log(`  ✅ ${lv.label}: 60 局共 ${totalSteps} 步，无死局（平均 ${(score / matched).toFixed(1)} 分/次）`);
}

/* ---- 6) 星级 ---- */
console.log('\n=== 6) 星级判定 ===');
for (const [s, tgt, expect] of [[120, 120, 1], [162, 120, 2], [204, 120, 3], [100, 120, 0]]) {
  const got = starOf(s, tgt);
  if (got !== expect) { console.log(`  ❌ ${s}/${tgt} → ${got}，期望 ${expect}`); bad++; }
  else console.log(`  ✅ ${s} 分 / 目标 ${tgt} → ${got} 星`);
}

console.log('\n' + (bad ? `❌ 共 ${bad} 处问题` : '✅ 全部通过'));
process.exit(bad ? 1 : 0);
