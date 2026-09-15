/* 迷你 CDP 驱动：连本地 Chrome（--remote-debugging-port=9222）跑真实浏览器验证
   用法：node ui_probe.mjs <flow>
   flow: index | grade2
   只读 + 模拟点击（点击是本次测试的必要动作：要验证答错后的交互行为） */
const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:8899';

let ws, nextId = 1;
const pending = new Map();
const events = [];

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('页面异常: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

async function main() {
  const target = await (await fetch(CDP + '/json/new?about:blank', { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      const p = pending.get(d.id); pending.delete(d.id);
      d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result);
    } else if (d.method) events.push(d);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');

  const flow = process.argv[2] || 'index';
  const url = flow === 'index' ? BASE + '/index.html?t=' + Date.now() : BASE + '/grade2.html?t=' + Date.now();
  const out = { flow, url, steps: [], consoleErrors: [] };

  await send('Page.navigate', { url });
  await sleep(1400);

  if (flow === 'index') {
    /* ---------- 数感训练：答错 → 渐进提示 → 重试 → 揭晓 ---------- */
    await evaluate(`document.querySelectorAll('.level-btn')[0].click()`);
    await sleep(400);

    out.steps.push({ step: '开局', desc: await evaluate(`JSON.stringify({
      stage: document.querySelector('#stageTag').textContent,
      q: document.querySelector('#question').innerText.replace(/\\n/g,' ').slice(0,60),
      opts: [...document.querySelectorAll('.ans-btn')].map(b=>b.textContent),
      stars: document.querySelector('#quizStars').textContent
    })`) });

    // 第 1 次故意答错
    const r1 = await evaluate(`(function(){
      const btns=[...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled);
      btns[0].click();
      const fb=document.querySelector('#feedback');
      return JSON.stringify({
        clicked: btns[0].textContent,
        cls: fb.className,
        text: fb.textContent,
        disabled: [...document.querySelectorAll('.ans-btn')].filter(b=>b.disabled).length,
        enabledLeft: [...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled).length,
        stars: document.querySelector('#quizStars').textContent,
        hintColor: getComputedStyle(fb).color
      });
    })()`);
    out.steps.push({ step: '第 1 次答错', result: JSON.parse(r1) });

    // 第 2 次故意答错
    const r2 = await evaluate(`(function(){
      const btns=[...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled);
      const pre = document.querySelector('#feedback').textContent;
      if(btns.length>1) btns[0].click();
      const fb=document.querySelector('#feedback');
      return JSON.stringify({
        hintChanged: pre !== fb.textContent,
        cls: fb.className, text: fb.textContent,
        enabledLeft: [...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled).length,
        stars: document.querySelector('#quizStars').textContent
      });
    })()`);
    out.steps.push({ step: '第 2 次答错', result: JSON.parse(r2) });

    // 继续点到把答案逼出来（第 3 次错 → 揭晓）
    const r3 = await evaluate(`(function(){
      const btns=[...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled);
      if(btns.length>1) btns[0].click();
      const fb=document.querySelector('#feedback');
      return JSON.stringify({
        cls: fb.className, text: fb.textContent,
        allDisabled: [...document.querySelectorAll('.ans-btn')].every(b=>b.disabled),
        correctMarked: [...document.querySelectorAll('.ans-btn')].filter(b=>b.classList.contains('correct')).map(b=>b.textContent),
        stars: document.querySelector('#quizStars').textContent
      });
    })()`);
    out.steps.push({ step: '提示用尽（揭晓）', result: JSON.parse(r3) });

    await sleep(2600);   // 等它推进到下一题
    /* 新题：先故意错一次拿提示，再点「正确选项」→ 应计入正确但不计星 */
    const r4 = await evaluate(`(function(){
      function answerOf(){
        const t = document.querySelector('#question').innerText.replace(/\\s/g,' ');
        const m = t.match(/(\\d+)\\s*([+\\u2212-])\\s*(\\d+)\\s*=/);
        if(m) return m[2]==='+' ? Number(m[1])+Number(m[3]) : Number(m[1])-Number(m[3]);
        // ① 数一数阶段：数两种 emoji 的个数
        const txt = document.querySelector('#question').innerText;
        const emo = txt.match(/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/gu) || [];
        return emo.length || null;
      }
      const ans = answerOf();
      const before = document.querySelector('#quizStars').textContent;
      const btns=[...document.querySelectorAll('.ans-btn')].filter(x=>!x.disabled);
      const wrong = btns.find(b=>Number(b.dataset.val)!==ans);
      wrong.click();
      return JSON.stringify({ ans, clickedWrong: wrong.textContent, hint: document.querySelector('#feedback').textContent.slice(0,40), starsBefore: before });
    })()`);
    const r5 = await evaluate(`(function(){
      function answerOf(){
        const t = document.querySelector('#question').innerText.replace(/\\s/g,' ');
        const m = t.match(/(\\d+)\\s*([+\\u2212-])\\s*(\\d+)\\s*=/);
        if(m) return m[2]==='+' ? Number(m[1])+Number(m[3]) : Number(m[1])-Number(m[3]);
        const txt = document.querySelector('#question').innerText;
        const emo = txt.match(/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/gu) || [];
        return emo.length || null;
      }
      const ans = answerOf();
      const hit = [...document.querySelectorAll('.ans-btn')].find(b=>Number(b.dataset.val)===ans);
      if(!hit) return JSON.stringify({ error:'没找到正确选项', ans });
      hit.click();
      return JSON.stringify({ ans, feedback: document.querySelector('#feedback').textContent,
        cls: document.querySelector('#feedback').className, stars: document.querySelector('#quizStars').textContent });
    })()`);
    out.steps.push({ step: '答错拿提示 → 点正确答案', result: JSON.parse(r4), then: JSON.parse(r5) });

    /* 下一题：一次答对 → 应 +1 星 */
    await sleep(1800);
    const r6 = await evaluate(`(function(){
      const t = document.querySelector('#question').innerText.replace(/\\s/g,' ');
      const m = t.match(/(\\d+)\\s*([+\\u2212-])\\s*(\\d+)\\s*=/);
      let ans = m ? (m[2]==='+'?Number(m[1])+Number(m[3]):Number(m[1])-Number(m[3])) : null;
      if(ans===null){ const emo=(document.querySelector('#question').innerText.match(/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/gu)||[]); ans=emo.length||null; }
      const before = document.querySelector('#quizStars').textContent;
      const hit=[...document.querySelectorAll('.ans-btn')].find(b=>Number(b.dataset.val)===ans);
      if(!hit) return JSON.stringify({ error:'没找到正确选项', ans, opts:[...document.querySelectorAll('.ans-btn')].map(b=>b.textContent) });
      hit.click();
      return JSON.stringify({ ans, starsBefore: before, feedback: document.querySelector('#feedback').textContent,
        starsAfter: document.querySelector('#quizStars').textContent });
    })()`);
    out.steps.push({ step: '一次答对（无提示）', result: JSON.parse(r6) });

    // 家长页：独立答对率 / 提示次数
    out.steps.push({ step: '家长页新增行', desc: await evaluate(`(function(){
      document.querySelector('#btnParent').click();
      const t = document.querySelector('#parentStats').innerText.replace(/\\n/g,' | ');
      document.querySelector('#btnParentBack').click();
      return t;
    })()`) });
  }

  if (flow === 'grade2' || flow === 'choice') {
    if (flow === 'choice') {
      // 解锁全部单元，直接测选择题玩法（算式的读写与名称）
      await evaluate(`localStorage.setItem('mathplay.g2.v2', JSON.stringify({stars:0,answered:0,correct:0,hints:0,days:{},modes:{},unlocked:['2 欢乐购物街','3 表内乘法','4 我的学校我的家','5 分类']}))`);
      await send('Page.navigate', { url: BASE + '/grade2.html?unlock=' + Date.now() });
      await sleep(1200);
      // 进第 3 个单元 → 找「算式的读写与名称」
      await evaluate(`[...document.querySelectorAll('.unit-card')].find(c=>c.innerText.includes('表内乘法')).click()`);
      await sleep(300);
      await evaluate(`[...document.querySelectorAll('.mode-btn')].find(b=>b.innerText.includes('算式的读写与名称')).click()`);
      await sleep(500);
      out.steps.push({ step: '选择题开局', desc: await evaluate(`JSON.stringify({
        q: document.querySelector('#question').innerText.replace(/\\n/g,' '),
        opts: [...document.querySelectorAll('.ans-btn')].map(b=>b.textContent)
      })`) });

      // 故意点一个错的
      const c1 = await evaluate(`(function(){
        function answerOf(){
          const t = document.querySelector('#question').innerText.replace(/\\s+/g,' ');
          let m = t.match(/(\\d+)\\s*×\\s*(\\d+)\\s*=\\s*(\\d+)\\s*中，\\s*(\\d+)\\s*叫什么/);
          if(m) return String(m[4]) === m[3] ? '积' : '乘数';
          if(t.includes('两个乘数相乘的结果叫')) return '积';
          m = t.match(/(\\d+)\\s*×\\s*(\\d+)\\s*=\\s*(\\d+)\\s*读作/);
          if(m) return m[1]+'乘'+m[2]+'等于'+m[3];
          return null;
        }
        const ans = answerOf();
        const norm = (s)=>String(s).replace(/\\s+/g,'');
        const btns=[...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled);
        const wrong = btns.find(b=>norm(b.textContent)!==norm(ans));
        const pre = document.querySelector('#quizStars').textContent;
        wrong.click();
        return JSON.stringify({ ans, clickedWrong: wrong.textContent, starsBefore: pre,
          cls: document.querySelector('#feedback').className,
          text: document.querySelector('#feedback').textContent,
          enabledLeft: [...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled).length,
          correctMarked: [...document.querySelectorAll('.ans-btn')].filter(b=>b.classList.contains('correct')).length });
      })()`);
      out.steps.push({ step: '选择题答错第 1 次', result: JSON.parse(c1) });

      // 直接点正确答案（用了提示 → 不应给星）
      const c2 = await evaluate(`(function(){
        function answerOf(){
          const t = document.querySelector('#question').innerText.replace(/\\s+/g,' ');
          let m = t.match(/(\\d+)\\s*×\\s*(\\d+)\\s*=\\s*(\\d+)\\s*中，\\s*(\\d+)\\s*叫什么/);
          if(m) return String(m[4]) === m[3] ? '积' : '乘数';
          if(t.includes('两个乘数相乘的结果叫')) return '积';
          m = t.match(/(\\d+)\\s*×\\s*(\\d+)\\s*=\\s*(\\d+)\\s*读作/);
          if(m) return m[1]+'乘'+m[2]+'等于'+m[3];
          return null;
        }
        const ans = answerOf();
        const norm=(s)=>String(s).replace(/\\s+/g,'');
        const hit=[...document.querySelectorAll('.ans-btn')].find(b=>norm(b.textContent)===norm(ans));
        if(!hit) return JSON.stringify({ error:'选项里找不到答案', ans, opts:[...document.querySelectorAll('.ans-btn')].map(b=>b.textContent) });
        hit.click();
        return JSON.stringify({ ans, feedback: document.querySelector('#feedback').textContent,
          cls: document.querySelector('#feedback').className, stars: document.querySelector('#quizStars').textContent });
      })()`);
      out.steps.push({ step: '选择题：用提示后答对', result: JSON.parse(c2) });

      // 键盘路径：数字键要按「还亮着的」顺序来
      await sleep(1800);
      const c3 = await evaluate(`(function(){
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'9'}));
        const pre = [...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled).length;
        const btns=[...document.querySelectorAll('.ans-btn')].filter(b=>!b.disabled);
        // 先点错一个，再按数字键 1，检查是否命中「第一个还亮着的」
        const before = btns.map(b=>b.textContent).join(',');
        btns[0].click();
        return JSON.stringify({ enabledBefore: pre, before, feedback: document.querySelector('#feedback').textContent.slice(0,30) });
      })()`);
      out.steps.push({ step: '键盘/禁用交互', result: JSON.parse(c3) });

      // grade2 的窄屏布局
      await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 2, mobile: true });
      await sleep(300);
      out.narrow = JSON.parse(await evaluate(`JSON.stringify({
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
        feedbackH: Math.round(document.querySelector('#feedback').getBoundingClientRect().height),
        feedbackText: document.querySelector('#feedback').textContent.slice(0,60),
        feedbackInView: (function(){const r=document.querySelector('#feedback').getBoundingClientRect();return r.top>=0 && r.bottom<=window.innerHeight;})()
      })`));
      const shot0 = await send('Page.captureScreenshot', { format: 'png' });
      const fsx = await import('node:fs');
      const px = process.env.TEMP + '/mathplay_choice_375.png';
      fsx.writeFileSync(px, Buffer.from(shot0.data, 'base64'));
      out.screenshot = px;
      out.consoleErrors = events.filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error').map((e) => e.params.entry.text);
      out.badResponses = events.filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400).map((e) => e.params.response.status + ' ' + e.params.response.url);
      out.jsExceptions = events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description || ''));
      console.log(JSON.stringify(out, null, 1));
      ws.close();
      return;
    }
    /* ---------- 二上闯关：拖拽题答错 → 提示 + 重挂重试 ---------- */
    // 打开第 1 个单元 → 第 2 个玩法（进位还是不进位，kind:'drag'）
    await evaluate(`document.querySelectorAll('.unit-card')[0].click()`);
    await sleep(300);
    out.steps.push({ step: '单元页', desc: await evaluate(`[...document.querySelectorAll('.mode-btn')].map(b=>b.innerText.split('\\n')[0]).join(' / ')`) });

    // 先拦截 DragEngine.mount 拿到 done 回调，再进玩法
    await evaluate(`(function(){
      window.__caps=[];
      const orig=window.DragEngine.mount;
      window.DragEngine.mount=function(root,q,done){ window.__caps.push(done); return orig.apply(this,arguments); };
      window.__patched=true;
    })()`);
    await evaluate(`document.querySelectorAll('.mode-btn')[1].click()`);
    await sleep(500);
    out.steps.push({ step: '拖拽题已挂载', desc: await evaluate(`JSON.stringify({
      patched: !!window.__patched, captured: window.__caps.length,
      prompt: document.querySelector('#question').innerText.replace(/\\n/g,' ').slice(0,70),
      hasNodes: document.querySelectorAll('#question .drag-scene, #question .drag-bin, #question .vcalc').length
    })`) });

    // 模拟第 1 次做错
    const d1 = await evaluate(`(function(){
      window.__caps[0](false);
      return JSON.stringify({ caps: window.__caps.length, feedback: document.querySelector('#feedback').textContent,
        cls: document.querySelector('#feedback').className });
    })()`);
    await sleep(500);
    const d2 = await evaluate(`JSON.stringify({ caps: window.__caps.length, stillMounted: document.querySelectorAll('#question > *').length>0 })`);
    out.steps.push({ step: '第 1 次做错', result: JSON.parse(d1), after: JSON.parse(d2) });

    // 模拟第 2 次做错（达到上限 → 揭晓并推进）
    const d3 = await evaluate(`(function(){
      window.__caps[window.__caps.length-1](false);
      return JSON.stringify({ feedback: document.querySelector('#feedback').textContent, cls: document.querySelector('#feedback').className });
    })()`);
    out.steps.push({ step: '第 2 次做错（用尽）', result: JSON.parse(d3) });

    await sleep(2700);
    out.steps.push({ step: '推进到下一题', desc: await evaluate(`JSON.stringify({ idxText: document.querySelector('#progress').style.width, newCaps: window.__caps.length })`) });

    // 家长页
    out.steps.push({ step: '家长页', desc: await evaluate(`(function(){
      document.querySelector('#btnQuit').click();
      return 'ok';
    })()`) });
  }

  /* ---------- 375px 窄屏 + 截图 ---------- */
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 2, mobile: true });
  await sleep(300);
  if (flow === 'index') {
    await evaluate(`document.querySelectorAll('.level-btn')[0].click()`);
    await sleep(300);
    await evaluate(`(function(){const b=[...document.querySelectorAll('.ans-btn')].filter(x=>!x.disabled); if(b.length>1) b[0].click();})()`);
    await sleep(300);
  }
  out.narrow = JSON.parse(await evaluate(`JSON.stringify({
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
    feedbackVisible: (function(){const f=document.querySelector('#feedback'); const r=f.getBoundingClientRect(); return r.height>0 && r.bottom<=window.innerHeight+1 && r.top>=0;})(),
    feedbackH: Math.round(document.querySelector('#feedback').getBoundingClientRect().height),
    feedbackText: document.querySelector('#feedback').textContent.slice(0,60)
  })`));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('node:fs');
  const p = process.env.TEMP + '/mathplay_' + flow + '_375.png';
  fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
  out.screenshot = p;

  out.consoleErrors = events
    .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
    .map((e) => e.params.entry.text);
  out.badResponses = events
    .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
    .map((e) => e.params.response.status + ' ' + e.params.response.url);
  out.jsExceptions = events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description || ''));

  console.log(JSON.stringify(out, null, 1));
  ws.close();
}
main().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
