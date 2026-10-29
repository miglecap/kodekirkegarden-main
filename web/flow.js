// The animated flowchart. Builds the SVG, lights up nodes, draws edges with a
// travelling dot, and moves the camera (the viewBox) to follow the action.
(function (KK) {
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = { human: '#6aa9ff', agent: '#f08a24', safe: '#4cd07d', unsure: '#f2c14e', keep: '#b58cff', neutral: '#8a93a8' };
  const W = 560;
  const H = 920;

  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  // s: shape, k: colour kind, l: label lines
  const nodes = {
    trigger: { s: 'pill', k: 'neutral', x: 280, y: 30, w: 300, h: 44, l: ['🔔 Security review flags request', 'Node upgrade planned next sprint'] },
    run: { s: 'rect', k: 'human', x: 280, y: 100, w: 230, h: 40, l: ['👤 Jonas runs the sweep'] },
    report: { s: 'rect', k: 'agent', x: 280, y: 330, w: 250, h: 44, l: ['📜 nekrologer.md', 'verdict · evidence · uncertainty'] },
    review: { s: 'diamond', k: 'human', x: 280, y: 410, w: 170, h: 60, l: ['👤 Jonas reads', 'each finding'] },
    safe: { s: 'rect', k: 'safe', x: 100, y: 500, w: 150, h: 50, l: ['Safe to bury', 'Trygt'] },
    unsure: { s: 'rect', k: 'unsure', x: 280, y: 500, w: 150, h: 50, l: ['Needs a decision', 'Usikkert'] },
    keep: { s: 'rect', k: 'keep', x: 460, y: 500, w: 150, h: 50, l: ['Do NOT remove', 'Behold'] },
    verify: { s: 'rect', k: 'safe', x: 100, y: 580, w: 150, h: 44, l: ['Verify the claim', 're-ask agent / grep'] },
    pr: { s: 'rect', k: 'safe', x: 100, y: 650, w: 150, h: 44, l: ['Open PR', 'remove safe items'] },
    tests: { s: 'diamond', k: 'safe', x: 100, y: 730, w: 150, h: 56, l: ['Tests + lint', 'pass?'] },
    merge: { s: 'rect', k: 'safe', x: 100, y: 810, w: 150, h: 40, l: ['Review & merge'] },
    who: { s: 'diamond', k: 'unsure', x: 280, y: 580, w: 150, h: 56, l: ['Who owns', 'the answer?'] },
    ask_owner: { s: 'rect', k: 'unsure', x: 280, y: 660, w: 160, h: 46, l: ['Ask finance /', 'product owner'] },
    ans: { s: 'diamond', k: 'unsure', x: 280, y: 745, w: 150, h: 56, l: ['Confirmed', 'dead?'] },
    ask2: { s: 'rect', k: 'keep', x: 460, y: 580, w: 150, h: 44, l: ['Control question', 'ask the agent first'] },
    doc: { s: 'rect', k: 'keep', x: 460, y: 660, w: 150, h: 44, l: ['Document why', 'it stays'] },
    done: { s: 'pill', k: 'safe', x: 280, y: 880, w: 230, h: 44, l: ['✅ Fewer dependencies', 'owners set · no trap deleted'] },
  };

  const BOX = { x: 280, y: 220, w: 460, h: 140 };
  const chips = {
    c_list: { x: 128, y: 205, l: 'list_filer' },
    c_deps: { x: 280, y: 205, l: 'avhengigheter' },
    c_search: { x: 432, y: 205, l: 'sok_i_repo' },
    c_refs: { x: 128, y: 255, l: 'finn_referanser' },
    c_indirect: { x: 280, y: 255, l: 'indirect-use check' },
    c_git: { x: 432, y: 255, l: 'hent_git_historikk' },
  };

  // d: path, lab: [text, x, y, anchor], dash: dotted track
  const edges = {
    e_trig_run: { d: 'M280 52 V80' },
    e_run_agent: { d: 'M280 120 V150' },
    e_agent_report: { d: 'M280 290 V308' },
    e_report_review: { d: 'M280 352 V380' },
    e_review_safe: { d: 'M280 440 V458 H100 V475', lab: ['Trygt', 190, 451, 'middle'] },
    e_review_unsure: { d: 'M280 440 V475', lab: ['Usikkert', 292, 461, 'start'] },
    e_review_keep: { d: 'M280 440 V458 H460 V475', lab: ['Behold', 370, 451, 'middle'] },
    e_safe_verify: { d: 'M100 525 V558' },
    e_verify_pr: { d: 'M100 602 V628' },
    e_pr_tests: { d: 'M100 672 V702' },
    e_tests_merge: { d: 'M100 758 V790', lab: ['yes', 112, 778, 'start'] },
    e_tests_fix: { d: 'M25 730 H10 V410 H195', dash: true, lab: ['no', 30, 720, 'start'] },
    e_unsure_who: { d: 'M280 525 V552' },
    e_who_ask: { d: 'M280 608 V637' },
    e_ask_ans: { d: 'M280 683 V717' },
    e_ans_pr: { d: 'M205 745 H190 V650 H175', lab: ['yes', 184, 700, 'end'] },
    e_ans_keep: { d: 'M355 745 H452 q8 -10 16 0 H548 V500 H535', lab: ['no / no answer', 400, 737, 'middle'] },
    e_keep_ask2: { d: 'M460 525 V558' },
    e_ask2_doc: { d: 'M460 602 V638' },
    e_doc_done: { d: 'M460 682 V880 H395' },
    e_merge_done: { d: 'M100 830 V880 H165' },
  };

  let svg;
  let gen = 0;
  const nodeEls = {};
  const chipEls = {};
  const edgeEls = {};
  let dot;
  let cam = { y: 0, h: H };
  let camAnim = 0;
  KK.follow = true;

  function shape(n, g) {
    const { x, y, w, h } = n;
    if (n.s === 'diamond') {
      return el('polygon', { class: 'shape', points: `${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}` }, g);
    }
    return el('rect', { class: 'shape', x: x - w / 2, y: y - h / 2, width: w, height: h, rx: n.s === 'pill' ? h / 2 : 10 }, g);
  }

  function label(n, g) {
    const t = el('text', {}, g);
    const gap = 15;
    n.l.forEach((line, i) => {
      const ts = el('tspan', { x: n.x, y: n.y + (i - (n.l.length - 1) / 2) * gap }, t);
      ts.textContent = line;
    });
  }

  function build(target) {
    svg = target;
    svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    for (const [id, color] of [['arr', '#2f3b59'], ['arrOn', '#f08a24']]) {
      const m = el('marker', { id, viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M1 1 L9 5 L1 9 z', fill: color }, m);
    }

    // The agent box, drawn first so edges and chips sit on top.
    const box = el('g', { class: 'node box', id: 'n-agent', style: `--c:${COLORS.agent}` }, svg);
    el('rect', { class: 'shape', x: BOX.x - BOX.w / 2, y: BOX.y - BOX.h / 2, width: BOX.w, height: BOX.h, rx: 14 }, box);
    const title = el('text', { class: 'title', x: 66, y: 170 }, box);
    title.textContent = '🤖 Agent loop · read-only';
    const hint = el('text', { class: 'hint', x: 494, y: 170 }, box);
    hint.textContent = '↻ repeats until done';
    nodeEls.agent = box;

    for (const id in edges) {
      const e = edges[id];
      const g = el('g', { class: 'edge', id }, svg);
      const track = el('path', { class: 'track' + (e.dash ? ' dash' : ''), d: e.d, 'marker-end': 'url(#arr)' }, g);
      const fill = el('path', { class: 'fill', d: e.d, 'marker-end': 'url(#arrOn)' }, g);
      const len = fill.getTotalLength();
      fill.style.strokeDasharray = len;
      fill.style.strokeDashoffset = len;
      fill.style.opacity = 0;
      if (e.lab) {
        const t = el('text', { x: e.lab[1], y: e.lab[2], 'text-anchor': e.lab[3] }, g);
        t.textContent = e.lab[0];
      }
      edgeEls[id] = { g, track, fill, len };
    }

    for (const id in nodes) {
      const n = nodes[id];
      const g = el('g', { class: 'node', id: 'n-' + id, style: `--c:${COLORS[n.k]}` }, svg);
      shape(n, g);
      label(n, g);
      nodeEls[id] = g;
    }

    for (const id in chips) {
      const c = chips[id];
      const g = el('g', { class: 'node chip', id: 'n-' + id, style: `--c:${COLORS.agent}` }, svg);
      el('rect', { class: 'shape', x: c.x - 68, y: c.y - 17, width: 136, height: 34, rx: 8 }, g);
      const t = el('text', { x: c.x, y: c.y }, g);
      t.textContent = c.l;
      chipEls[id] = g;
    }

    dot = el('circle', { class: 'dot', r: 5, cx: -20, cy: -20 }, svg);
    setCamera(0, true);
  }

  function reset() {
    gen++;
    for (const id in nodeEls) nodeEls[id].classList.remove('active', 'visited');
    for (const id in chipEls) chipEls[id].classList.remove('active', 'done');
    for (const id in edgeEls) {
      const e = edgeEls[id];
      e.g.classList.remove('done');
      e.fill.style.transition = 'none';
      e.fill.style.strokeDashoffset = e.len;
      e.fill.style.opacity = 0;
    }
    dot.setAttribute('cx', -20);
    dot.setAttribute('cy', -20);
  }

  function setActive(ids) {
    for (const id in nodeEls) {
      const on = ids.includes(id);
      nodeEls[id].classList.toggle('active', on);
      if (on) nodeEls[id].classList.add('visited');
    }
  }

  function setChip(id, state) {
    const c = chipEls[id];
    c.classList.toggle('active', state === 'active');
    c.classList.toggle('done', state === 'done');
  }

  // Draws one edge. instant=true jumps straight to the finished state.
  function edge(id, instant, speed = 1) {
    const e = edgeEls[id];
    e.fill.style.opacity = 1;
    if (instant) {
      e.fill.style.transition = 'none';
      e.fill.style.strokeDashoffset = 0;
      e.g.classList.add('done');
      return Promise.resolve();
    }
    const my = gen;
    const dur = Math.max(650, Math.min(1500, e.len * 9)) / speed;
    e.fill.style.transition = 'none';
    e.fill.style.strokeDashoffset = e.len;
    void e.fill.getBoundingClientRect();
    e.fill.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.45,.05,.3,1)`;
    e.fill.style.strokeDashoffset = 0;
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        if (my !== gen) return resolve();
        const p = Math.min(1, (now - t0) / dur);
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const pt = e.fill.getPointAtLength(e.len * eased);
        dot.setAttribute('cx', pt.x);
        dot.setAttribute('cy', pt.y);
        if (p < 1) return requestAnimationFrame(frame);
        e.g.classList.add('done');
        dot.setAttribute('cx', -20);
        dot.setAttribute('cy', -20);
        resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  function viewHeight() {
    const r = svg.getBoundingClientRect();
    return r.width && r.height ? Math.min(H, W * (r.height / r.width)) : H;
  }

  function setCamera(y, instant) {
    const h = viewHeight();
    const target = Math.max(0, Math.min(H - h, y));
    cancelAnimationFrame(camAnim);
    const apply = (yy) => { cam = { y: yy, h }; svg.setAttribute('viewBox', `0 ${yy} ${W} ${h}`); };
    if (instant) return apply(target);
    const from = cam.y;
    const t0 = performance.now();
    const dur = 1100;
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      apply(from + (target - from) * e);
      if (p < 1) camAnim = requestAnimationFrame(frame);
    };
    camAnim = requestAnimationFrame(frame);
  }

  // Show the whole chart at once.
  function fit() {
    cancelAnimationFrame(camAnim);
    cam = { y: 0, h: H };
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  // Centre the camera on the given nodes (or the whole chart when not following).
  function focus(ids, instant) {
    if (!KK.follow) return fit();
    const all = ids.map((id) => nodes[id] || chips[id] || (id === 'agent' ? BOX : null)).filter(Boolean);
    if (!all.length) return;
    const top = Math.min(...all.map((n) => n.y - (n.h || 34) / 2));
    const bottom = Math.max(...all.map((n) => n.y + (n.h || 34) / 2));
    setCamera((top + bottom) / 2 - viewHeight() / 2, instant);
  }

  KK.flow = { build, reset, setActive, setChip, edge, focus, setCamera, fit };
})(window.KK);
