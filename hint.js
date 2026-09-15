/* 数学岛 — 渐进提示引擎（hint.js）
   index.html（数感训练）与 grade2.html（二上闯关）共用。无依赖，先于业务脚本加载。

   ── 为什么要做这个（实测证据，不是拍脑袋）────────────────────────
   Bastani et al. (2025, PNAS)《Generative AI without guardrails can harm learning》：
   同一批高中数学生、同一个 GPT-4，只换交互设计——
     · 直接给答案（GPT Base）   → 练习时成绩 +48%，期末考试 −17%
     · 只给提示引导（GPT Tutor）→ 练习时成绩 +127%，期末考试不降
   即：答错时「给方向」远好于「给答案」；直接报答案还会伤到真正的掌握。
   Bloom (1984) 两西格玛研究也指出：一对一之所以有效，关键是学生「必须真正掌握」而不是被推着走。

   ── 本引擎的三条规则 ────────────────────────────────────────
   1. 答错不揭晓答案 → 只给一级方向提示，孩子可以继续作答（选项逐次淘汰）
   2. 连错到上限才揭晓，该题计入答错
   3. 星级只奖励「不靠提示一次答对」；用了提示后答对 → 计入正确率、不计星
      —— 把「练习表现」和「独立表现」分开测量，正是上面那个实验的练习/期末两个指标
*/
var HintEngine = (function () {
  'use strict';

  const MAX_CHOICE = 3;   // 选择题最多尝试次数（含最后一次揭晓）
  const MAX_DRAG = 2;     // 拖拽题最多尝试次数（重挂一次，操作量大，给两次机会）

  /* ================= 通用 ================= */
  // 提示值可以是字符串、函数(q)=>string，或数组（数组=分级提示，逐级取）
  function evalHint(v, q, mode, level) {
    if (v == null) return '';
    if (Array.isArray(v)) {
      if (!v.length) return '';
      return evalHint(v[Math.min(level - 1, v.length - 1)], q, mode, level);
    }
    if (typeof v === 'function') { try { return String(v(q, mode) || ''); } catch (e) { return ''; } }
    return String(v);
  }

  /* ================= 二上闯关：按玩法 id 的方向提示 ================= */
  const MODE_HINTS = {
    'v-add': [
      '竖式要从个位算起，先看最右边那一列',
      '把这一列的两个数按竖式的算法走一遍，再看方框要填的是哪个数位'
    ],
    'v-carry': [
      function (q) { return q.op === '+' ? '只看个位：两位相加满 10 了吗？满 10 就要进位' : '只看个位：被减数的个位够不够减？不够就要退位'; },
      '进（退）位只看个位，不用管十位。个位满 10 / 不够减就是「要」'
    ],
    'v-estimate': [
      '估算是把两个数都看成最接近的整十数，再算这个估算算式',
      '题目已经把两个数都估好了（≈ 后面那个数），把这两个整十数相加或相减就是答案'
    ],
    'balance-add': [
      '天平平衡 = 两边一样多。先算出左盘的结果，再拖一个和它相等的数',
      '左盘是加减法，按竖式的算法算出来；干扰项常是「漏进位 / 多看一位」的错算结果'
    ],
    'rmb-unit': [
      '看钱币上写的单位：是「元」「角」还是「分」？',
      '1 元最大、1 分最小。看文字不看数字大小'
    ],
    'rmb-conv': [
      '1 元 = 10 角，把一样多的钱连起来',
      '把「几元几角」都换成角：几元就是几十角，再加上几角'
    ],
    'pay-drag': [
      '从大面额开始付，快够了再补小面额',
      '先看有没有一张刚好够的；不够就用两三张凑成这个价钱'
    ],
    'mul-intro': [
      '平均分 = 每个盘子里的个数一样多',
      '一个一个轮流放：第 1 个放 1 号盘、第 2 个放 2 号盘……一圈放完再放下一圈'
    ],
    // 概念命名题：必须按「问的是哪个名字」分情况，否则提示里会直接出现答案词
    'mul-names': [
      function (q) {
        const a = String(q.ans);
        if (a === '积') return '乘号两边的那两个数叫「乘数」；题目问的是等号后面那个结果的名字';
        if (a === '乘数') return '题目问的是乘号两边的那种数。它不是运算的结果，也不叫「积」';
        return '读法要按顺序念：先念乘号左边的数，再念「乘」，然后念乘号右边的数，最后念等号后面的结果';
      },
      function (q) {
        const a = String(q.ans);
        if (a === '积') return '想想加法的结果是「和」、减法的结果是「差」——乘法结果的名字是第三个字';
        if (a === '乘数') return '两个字的那种叫法里，排除掉「结果」和「加减法的名字」，剩下的就是它';
        return '把选项一个一个念出来，哪个念着和算式对得上，就是它';
      }
    ],
    'balance-mul': [
      '先想乘法口诀算出左边的结果，再找和它相等的数',
      '干扰项常是「多一个几 / 少一个几」的口诀记错结果，算完再对照一下'
    ],
    'mul-addsub': [
      '先算乘法，再算加减（先乘后加减）',
      '把乘法那一步先算出来，再和后面的数相加或相减'
    ],
    'direction': [
      '先看目标在你上面还是下面、左边还是右边，再决定先走哪个方向',
      '一步一步来：先让行对上（往上或往下），再让列对上（往左或往右）'
    ],
    'route': [
      '记住方位：上北、下南、左西、右东',
      '先读题目里的方向词，再到十字图上找对应的位置放'
    ],
    'left-right': [
      '从左数，第一个就是最左边那个位置',
      '一个一个往右数：数到第几个，就把人放第几个'
    ],
    'stats-table': [
      '一行一行地点，点过的就不会数漏',
      '先只数一种水果，数完再换下一种；统计表会自己长出来'
    ],
    'classify-drag': [
      '先看两个筐的名字，再想每个图形该进哪个',
      '同一种图形放同一个筐：颜色或形状要对得上'
    ],
    'combo': [
      '每一件上衣都要和每一条下装各连一次',
      '先给第一件上衣连完所有下装，再连第二件，这样不会漏'
    ],
    'reasoning': [
      '先找最确定的那个人：谁最高？谁最矮？',
      '两个人比出来后位置就固定了：A 比 B 高、B 比 C 高，那么 A 在最上面'
    ]
  };

  /* ================= 二上闯关：按拖拽题型兜底 ================= */
  const TYPE_HINTS = {
    vfill: ['竖式从个位算起', '这一位算完别忘了进位或退位'],
    carry: ['只比较个位', '满 10 进 1，不够减退 1'],
    eqfill: ['先读算式，想清楚先算什么', '按运算顺序一步步来'],
    classify: ['先看清每个筐的名字', '同一类的东西放一起'],
    pay: ['从大面额开始付', '快够了再补小面额'],
    count: ['一行一行地点', '点过的不会数漏'],
    link: ['把相等的连起来', '一类一类连，连完再换下一个'],
    order: ['先找出最确定的那个人', '比出来一个就固定一个'],
    maze: ['先看目标在哪个方向', '先对上行，再对上列'],
    place: ['上北下南、左西右东', '先读方向词再放'],
    seat: ['从左数，第一个在最左边', '一个个往右数'],
    group: ['平均分就是每份一样多', '一个一个轮流放'],
    fill: ['每份要一样多', '按每份的数量一堆一堆摆'],
    balance: ['天平平衡 = 两边一样多', '先算左边，再找相等的数']
  };

  const GENERIC = [
    '再读一遍题目，把知道的数圈出来',
    '先想清楚题目在问什么，再看要算什么'
  ];

  /* ================= 数感训练：按难度/阶段生成（动态，只用题目里已有的信息） ================= */
  // 第一级：策略提示（不给算法，只指方向）
  const APP_STRATEGY = {
    C: '先数左边有几个，再数右边有几个，最后合起来数一数',
    P: '看圆点：把两组圆点连起来数，也可以先把前面的凑满一整组',
    A: '先把数拆成整十和个位，再分别相加或相减'
  };
  const APP_LEVEL_STRATEGY = {
    1: '把两堆合起来数一数：先数大的一堆，再往后数小的那些',
    2: '想一想凑十法：先补满一整组再加剩下的；减法可以整组整组地拿',
    3: '先看十位：几十加几十、几十减几十，再处理个位'
  };

  // 第二级：具体算法（只讲方法，绝不出现答案 —— test_hint.js 会逐题扫描泄题）
  const isTen = (n) => n % 10 === 0;
  function appMethod(q) {
    if (q.op === '+') {
      // 个位凑十：只出现 1 位数与「10」，答案必为 11~19，不会撞上
      if (q.a < 10 && q.b < 10 && q.a + q.b > 10) {
        return '凑十法：' + q.a + ' 再添 ' + (10 - q.a) + ' 个正好满一整组，把 ' + q.b +
          ' 分成 ' + (10 - q.a) + ' 和 ' + (q.b - (10 - q.a)) + '，先凑满再加剩下的';
      }
      if (isTen(q.a) && isTen(q.b)) return '整十数相加：只把十位上的数相加，个位的 0 不动';
      if (q.a > 20 || q.b > 20) return '拆开算：整十的部分先加，个位的部分再加，最后合起来';
      return '从 ' + Math.max(q.a, q.b) + ' 开始，往后数 ' + Math.min(q.a, q.b) + ' 个';
    }
    // 减法：被减数可以念，减数不能念（两倍关系时减数恰好等于答案）
    if (isTen(q.a) && isTen(q.b)) return '整十数相减：只把十位上的数相减，个位的 0 不动';
    if (q.b >= 10) return '把减数拆成整十和个位两部分：先减掉整十的那部分，再减个位的那部分';
    if (q.a > 20) return '十位减十位、个位减个位；个位不够减就从十位借 1（退位）';
    return '从 ' + q.a + ' 开始往前倒着数，数一下少 1，一直数到减数那么多下';
  }

  /* ================= 对外接口 ================= */
  function text(q, mode, level) {
    level = level || 1;
    mode = mode || {};
    // 1) 题目自带提示（未来可在 gen() 里写 hint/hints，优先级最高）
    const own = evalHint(q && (q.hints || q.hint), q, mode, level);
    if (own) return own;

    // 2) 数感训练：题目带 cpa 阶段，或 mode 是 LEVELS 条目 → 动态生成
    if (q && (q.cpa || (mode && mode.id && !mode.unit && typeof mode.gen === 'function'))) {
      if (level <= 1) {
        if (q.cpa && APP_STRATEGY[q.cpa]) return APP_STRATEGY[q.cpa];
        return APP_LEVEL_STRATEGY[mode.id] || '先看清楚题目里有几个数，再想用加法还是减法';
      }
      return appMethod(q);
    }

    // 3) 二上闯关：按玩法 id
    const mh = mode && MODE_HINTS[mode.id];
    if (mh) {
      const s = evalHint(mh, q, mode, level);
      if (s) return s;
    }

    // 4) 按拖拽题型
    const th = q && q.type && TYPE_HINTS[q.type];
    if (th) {
      const s = evalHint(th, q, mode, level);
      if (s) return s;
    }

    // 5) 兜底
    return GENERIC[Math.min(level - 1, GENERIC.length - 1)];
  }

  // 揭晓语：只在「提示用尽」时调用
  function reveal(q, mode) {
    q = q || {};
    const a = q.ans;
    if (a !== undefined && a !== null && a !== '') {
      const eq = (q.a !== undefined && q.b !== undefined && q.op)
        ? '（' + q.a + ' ' + q.op + ' ' + q.b + ' = ' + a + '）' : '';
      return '答案是 ' + a + eq + '。看明白了就继续';
    }
    if (q.answer !== undefined) return '应该放在第 ' + q.answer + ' 个位置。继续下一题';
    if (q.per !== undefined) return '每份放 ' + q.per + ' 个。继续下一题';
    if (q.total !== undefined && q.boxes) return '每个盘子放 ' + (q.total / q.boxes) + ' 个。继续下一题';
    if (q.price !== undefined) return '刚好要付 ' + q.price + ' 元。继续下一题';
    return text(q, mode, 2) + '。先看明白，下一题自己来';
  }

  return {
    MAX_CHOICE: MAX_CHOICE,
    MAX_DRAG: MAX_DRAG,
    text: text,
    reveal: reveal,
    // 供测试用
    _modeHints: MODE_HINTS,
    _typeHints: TYPE_HINTS
  };
})();

if (typeof window !== 'undefined') window.HintEngine = HintEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = HintEngine;
