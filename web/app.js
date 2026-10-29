// The walkthrough player. Each step drives the flowchart, the stage (repo,
// packages, findings, actions, result) and the terminal in sync.
(function (KK) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CANCEL = Symbol('cancel');
  const flow = KK.flow;

  const TABS = [
    ['context', 'Context'], ['repo', 'Repo'], ['packages', 'Packages'],
    ['findings', 'Findings'], ['actions', 'Actions'], ['result', 'Result'],
  ];

  let speed = 1;
  let playing = false;
  let index = -1;
  let stepDone = true;
  let ctx = null;

  /* ---------- stage: tabs ---------- */

  function buildTabs() {
    const nav = $('#tabs');
    nav.innerHTML = '';
    for (const [id, label] of TABS) {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.tab = id;
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => showTab(id));
      nav.appendChild(b);
    }
  }

  function showTab(id) {
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    $$('.view').forEach((v) => v.classList.toggle('on', v.dataset.view === id));
  }

  const scrollEnd = (view) => {
    const v = $(`.view[data-view=${view}]`);
    v.scrollTo({ top: v.scrollHeight, behavior: 'smooth' });
  };

  /* ---------- stage: repo tree ---------- */

  const rows = {};

  function buildTree() {
    const tree = $('#tree');
    tree.innerHTML = '';
    for (const k in rows) delete rows[k];
    for (const g of KK.files) {
      const d = document.createElement('div');
      d.className = 'dir';
      d.textContent = g.dir || './';
      tree.appendChild(d);
      for (const f of g.files) {
        const row = document.createElement('div');
        row.className = 'file';
        row.innerHTML = `<span class="dot2"></span><span class="nm"></span><span class="badges"></span>`;
        $('.nm', row).textContent = f;
        tree.appendChild(row);
        rows[g.dir + f] = row;
      }
    }
  }

  function badge(path, text, cls = '', c) {
    const b = document.createElement('span');
    b.className = 'badge ' + cls;
    b.textContent = text;
    $('.badges', rows[path]).appendChild(b);
    if (c && !c.instant) rows[path].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  const fileClass = (path, cls) => rows[path].classList.add(cls);

  async function scanTree(c) {
    for (const row of Object.values(rows)) {
      if (c.instant) { row.classList.add('seen'); continue; }
      row.classList.add('scan');
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      await c.wait(60);
      row.classList.remove('scan');
      row.classList.add('seen');
    }
  }

  /* ---------- stage: packages ---------- */

  let pkgRows = [];

  function buildPackages() {
    const body = $('#pkgBody');
    body.innerHTML = '';
    pkgRows = KK.packages.map((p) => {
      const tr = document.createElement('tr');
      if (p.use === 'dead' || p.use === 'orphan') tr.classList.add('bad');
      tr.innerHTML = `<td></td><td></td><td><span class="tag ${p.use}"></span></td>`;
      tr.children[0].textContent = p.n;
      tr.children[1].textContent = p.where;
      $('.tag', tr).textContent = KK.useLabel[p.use];
      body.appendChild(tr);
      return tr;
    });
  }

  async function revealPackages(c) {
    for (const tr of pkgRows) {
      tr.classList.add('on');
      if (!c.instant) {
        tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await c.wait(tr.classList.contains('bad') ? 520 : 230);
      }
    }
  }

  /* ---------- stage: findings ---------- */

  const cardEls = {};

  const colBox = (col) => $(`.col[data-col=${col}] .cards`);

  function buildCards() {
    for (const k in cardEls) delete cardEls[k];
    $$('.cards').forEach((n) => (n.innerHTML = ''));
    for (const d of KK.cards) {
      const card = document.createElement('div');
      card.className = `card ${d.col}`;
      card.innerHTML = '<b></b><span></span>';
      $('b', card).textContent = d.t;
      $('span', card).textContent = d.d;
      colBox(d.col).appendChild(card);
      cardEls[d.id] = card;
    }
    $$('.col').forEach((n) => n.classList.remove('focus'));
  }

  async function flyCards(c) {
    for (const d of KK.cards) {
      cardEls[d.id].classList.add('in');
      if (!c.instant) {
        cardEls[d.id].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await c.wait(260);
      }
    }
  }

  function moveCard(id, col, pillText, pillClass, instant) {
    const card = cardEls[id];
    const first = card.getBoundingClientRect();
    card.classList.remove('safe', 'unsure', 'keep');
    card.classList.add(col);
    colBox(col).appendChild(card);
    const pill = document.createElement('div');
    pill.className = 'pill ' + pillClass;
    pill.textContent = pillText;
    card.appendChild(pill);
    if (instant) return;
    card.scrollIntoView({ block: 'nearest' });
    const last = card.getBoundingClientRect();
    card.style.transition = 'none';
    card.style.transform = `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(1.04)`;
    void card.offsetWidth;
    card.style.transition = 'transform 1s cubic-bezier(.22,.8,.24,1), box-shadow .5s';
    card.style.transform = '';
    setTimeout(() => { card.style.transition = ''; }, 1100);
  }

  const focusCol = (name) => $$('.col').forEach((n) => n.classList.toggle('focus', n.dataset.col === name));

  /* ---------- stage: actions ---------- */

  const block = (id, on = true) => $(id).classList.toggle('on', on);

  async function addDiff(lines, c) {
    const box = $('#diff');
    for (const l of lines) {
      const d = document.createElement('div');
      if (l.f) { d.className = 'file-h'; d.textContent = l.f; } else { d.className = 'rm'; d.textContent = '-' + l.rm; }
      box.appendChild(d);
      if (!c.instant) await c.wait(300);
    }
    if (!c.instant) scrollEnd('actions');
  }

  async function addMsg(who, text, cls, c, from) {
    const m = document.createElement('div');
    m.className = `msg ${who} ${cls || ''}`;
    m.innerHTML = '<small></small><span></span>';
    $('small', m).textContent = from;
    $('span', m).textContent = text;
    $('#msgs').appendChild(m);
    if (!c.instant) { scrollEnd('actions'); await c.wait(900); }
    return m;
  }

  async function typing(c, from, ms) {
    if (c.instant) return null;
    const m = document.createElement('div');
    m.className = 'msg them';
    m.innerHTML = '<small></small><span class="typing"><i></i><i></i><i></i></span>';
    $('small', m).textContent = from;
    $('#msgs').appendChild(m);
    scrollEnd('actions');
    await c.wait(ms);
    m.remove();
    return null;
  }

  function resetActions() {
    ['#blkPr', '#blkChecks', '#blkMsgs', '#blkQa', '#blkDoc'].forEach((s) => block(s, false));
    $('#diff').innerHTML = '';
    $('#msgs').innerHTML = '';
    $('#qaAnswer').classList.remove('in');
    for (const id of ['#chkTest', '#chkLint']) $(id).classList.remove('ok');
  }

  /* ---------- stage: result ---------- */

  const STATS = [
    { n: 4, l: 'dependencies removed', d: 'lodash · request · sinon · moment', c: 'var(--safe)' },
    { n: 1, l: 'deprecated package gone', d: 'request', c: 'var(--safe)' },
    { n: 5, l: 'look-dead-but-live items kept', d: 'formaterBookingForLonn · ryddGamleBookinger · teams · rimraf · nodemon', c: 'var(--keep)' },
    { n: 1, l: 'open question parked safely', d: 'nyKalender stays until its owner answers', c: 'var(--unsure)' },
    { n: 37, l: 'agent tool calls for the sweep', d: 'measured in the project run', c: 'var(--agent)' },
    { n: 0, l: 'files edited by the agent', d: 'every deletion was a human decision', c: 'var(--human)' },
  ];

  function buildStats() {
    const box = $('#stats');
    box.innerHTML = '';
    for (const s of STATS) {
      const d = document.createElement('div');
      d.className = 'stat';
      d.style.setProperty('--c', s.c);
      d.innerHTML = '<div class="n">0</div><div class="l"></div><div class="d"></div>';
      $('.l', d).textContent = s.l;
      $('.d', d).textContent = s.d;
      box.appendChild(d);
    }
  }

  async function revealStats(c) {
    const items = $$('.stat');
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      el.classList.add('in');
      const n = $('.n', el);
      const target = STATS[i].n;
      if (c.instant || target === 0) { n.textContent = target; if (!c.instant) await c.wait(300); continue; }
      const t0 = performance.now();
      const dur = 900 / speed;
      await new Promise((res) => {
        const f = (now) => {
          if (c.cancelled) return res();
          const p = Math.min(1, (now - t0) / dur);
          n.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          p < 1 ? requestAnimationFrame(f) : res();
        };
        requestAnimationFrame(f);
      });
      await c.wait(250);
    }
  }

  /* ---------- terminal ---------- */

  const term = () => $('#term');
  const esc = (t) => t.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));

  function line(html, cls = '') {
    const d = document.createElement('div');
    d.className = 'ln ' + cls;
    d.innerHTML = html;
    term().appendChild(d);
    term().scrollTop = term().scrollHeight;
    return d;
  }

  async function cmd(c, text) {
    const d = line('<span class="p">$ </span><span class="t"></span><span class="caret"></span>');
    const t = $('.t', d);
    if (c.instant) { t.textContent = text; $('.caret', d).remove(); return; }
    for (const ch of text) {
      t.textContent += ch;
      term().scrollTop = term().scrollHeight;
      await c.wait(18);
    }
    await c.wait(350);
    $('.caret', d).remove();
  }

  async function tool(c, name, args, size) {
    line(`<span class="tool">→ ${name}</span> <span class="args">${esc(args)}</span>`);
    if (!c.instant) await c.wait(800);
    line(`<span class="ok">  ✓ ${size} tegn tilbake</span>`);
    if (!c.instant) await c.wait(400);
  }

  const out = (html, cls) => line(html, cls);

  /* ---------- steps ---------- */

  // who: human | agent (colours the timeline). Each run() is a sequence of
  // edges, node highlights, terminal lines and stage animations.
  const steps = [
    {
      title: 'The trigger', who: 'human', tab: 'context', focus: ['trigger'],
      text: 'A security review flags the deprecated request package, and a Node upgrade is coming. Jonas inherited Romvakt, and nobody who wrote it is left.',
      async run(c) {
        c.activate(['trigger']);
        await c.reveal('.alert');
        await c.reveal('.persona');
      },
    },
    {
      title: 'Start the sweep', who: 'human', tab: 'context', focus: ['run', 'agent'],
      text: 'Some code looks dead but is not. Jonas runs one command. The agent is read-only: it can search and read, but it cannot edit anything.',
      async run(c) {
        await c.edge('e_trig_run');
        c.activate(['run']);
        c.reveal('.danger-h').catch(() => {});
        c.reveal('.trap', 450).catch(() => {});
        await cmd(c, 'npm start -- --rapport "Gå gjennom hele hjemsokt-repo og skriv en nekrolog for hvert funn du er trygg på."');
        await c.edge('e_run_agent');
        c.activate(['agent']);
      },
    },
    {
      title: 'list_filer: see the whole repo', who: 'agent', tab: 'repo', focus: ['c_list'],
      text: 'The agent starts by listing every file, so it knows what exists before it judges anything.',
      async run(c) {
        c.activate(['agent']);
        c.chip('c_list', 'active');
        await tool(c, 'list_filer', '{}', 702);
        await scanTree(c);
        c.chip('c_list', 'done');
      },
    },
    {
      title: 'avhengigheter: which packages are really used?', who: 'agent', tab: 'packages', focus: ['c_deps'],
      text: 'It checks code, npm scripts and config for every package, and ignores commented-out code. Three packages are unused, and moment lives and dies with one file.',
      async run(c) {
        c.activate(['agent']);
        c.chip('c_deps', 'active');
        await tool(c, 'avhengigheter', '{}', 1618);
        await revealPackages(c);
        c.chip('c_deps', 'done');
      },
    },
    {
      title: 'sok_i_repo: hunt for suspects', who: 'agent', tab: 'repo', focus: ['c_search'],
      text: 'Skipped tests, TODOs, feature flags and commented-out blocks light up across the repo.',
      async run(c) {
        c.activate(['agent']);
        c.chip('c_search', 'active');
        await tool(c, 'sok_i_repo', '{"monster":"featureFlags|venteliste|eksternRabatt|brukLdap","regex":true}', 653);
        badge('config/default.js', '4 feature flags', 'blue', c);
        badge('src/routes/rom.js', 'reads nyKalender flag', 'blue', c);
        badge('src/middleware/auth.js', 'reads brukLdap flag', 'blue', c);
        if (!c.instant) await c.wait(700);
        await tool(c, 'sok_i_repo', '{"monster":"\\\\.skip|xit\\\\(|xdescribe|test\\\\.todo|it\\\\.todo","regex":true}', 301);
        badge('test/bookingService.test.js', 'skipped tests', '', c);
        badge('test/rom.test.js', 'skipped tests', '', c);
        badge('test/varsling.test.js', 'skipped test', '', c);
        badge('src/kalender/nyKalender.js', 'TODO 2021', '', c);
        badge('src/services/varsling.js', 'TODO + commented-out', '', c);
        badge('src/server.js', 'commented-out routes', '', c);
        badge('src/utils/dato.js', 'commented-out', '', c);
        badge('src/services/bookingService.js', 'FIXME + commented-out', '', c);
        if (!c.instant) await c.wait(600);
        c.chip('c_search', 'done');
      },
    },
    {
      title: 'finn_referanser: who calls it?', who: 'agent', tab: 'repo', focus: ['c_refs'],
      text: 'legacyCsv has zero references. formaterBookingForLonn has no callers in code either, only a note in the README.',
      async run(c) {
        c.activate(['agent']);
        c.chip('c_refs', 'active');
        await tool(c, 'finn_referanser', '{"navn":"legacyCsv"}', 68);
        badge('src/utils/legacyCsv.js', '0 references', 'red', c);
        if (!c.instant) await c.wait(600);
        await tool(c, 'finn_referanser', '{"navn":"formaterBookingForLonn"}', 147);
        badge('src/services/bookingService.js', 'formaterBookingForLonn: README only', 'blue', c);
        badge('README.md', 'mentions payroll repo', 'blue', c);
        if (!c.instant) await c.wait(600);
        c.chip('c_refs', 'done');
      },
    },
    {
      title: 'Indirect-use check: the step that prevents disasters', who: 'agent', tab: 'repo', focus: ['c_indirect'],
      text: 'Zero callers is not proof of death. The agent reads config and finds jobs and plugins loaded by name, and npm scripts that use dev tools.',
      async run(c) {
        c.activate(['agent']);
        c.chip('c_indirect', 'active');
        await tool(c, 'les_fil', '{"fil":"config/default.js"}', 863);
        badge('config/default.js', 'names jobs + plugins', 'blue', c);
        await tool(c, 'les_fil', '{"fil":"src/jobber/index.js"}', 693);
        fileClass('src/jobber/rydding.js', 'keep');
        badge('src/jobber/rydding.js', 'loaded by config string', 'purple', c);
        await tool(c, 'les_fil', '{"fil":"src/plugins/index.js"}', 412);
        fileClass('src/plugins/teams.js', 'keep');
        badge('src/plugins/teams.js', 'dynamic import()', 'purple', c);
        fileClass('src/services/bookingService.js', 'keep');
        badge('src/services/bookingService.js', 'used by payroll repo', 'purple', c);
        fileClass('package.json', 'keep');
        badge('package.json', 'scripts: rimraf, nodemon', 'purple', c);
        if (!c.instant) await c.wait(700);
        c.chip('c_indirect', 'done');
      },
    },
    {
      title: 'hent_git_historikk: when was it last touched?', who: 'agent', tab: 'repo', focus: ['c_git'],
      text: 'legacyCsv.js was last changed on 2021-02-15 by Mona, who has left the company. That is five years of silence.',
      async run(c) {
        c.activate(['agent']);
        c.chip('c_git', 'active');
        await tool(c, 'hent_git_historikk', '{"fil":"src/utils/legacyCsv.js"}', 506);
        badge('src/utils/legacyCsv.js', '2021 · Mona (left) · 5 years', 'blue', c);
        badge('src/kalender/nyKalender.js', '2021 · Petter (moved) · 4 years', 'blue', c);
        if (!c.instant) await c.wait(700);
        c.chip('c_git', 'done');
      },
    },
    {
      title: 'The report: a verdict with evidence for each finding', who: 'agent', tab: 'findings', focus: ['report'],
      text: 'The agent writes nekrologer.md. Every finding is sorted into one of three verdicts, with the evidence and what was not checked.',
      async run(c) {
        await c.edge('e_agent_report');
        c.activate(['report']);
        out('<span class="hl">📜 Skrev nekrologer.md</span>');
        out('<span class="grey">5 runder, 37 verktøykall, 49508 tokens inn, 7047 tokens ut</span>');
        await flyCards(c);
      },
    },
    {
      title: 'Triage: Jonas reads every finding', who: 'human', tab: 'findings', focus: ['review', 'safe', 'unsure', 'keep'],
      text: 'A human takes over. Each finding goes down one of three paths: Trygt, Usikkert or Behold.',
      async run(c) {
        await c.edge('e_report_review');
        c.activate(['review']);
        if (!c.instant) await c.wait(500);
        await c.edges(['e_review_safe', 'e_review_unsure', 'e_review_keep']);
        c.activate(['safe', 'unsure', 'keep']);
        for (const col of ['safe', 'unsure', 'keep']) {
          focusCol(col);
          if (!c.instant) await c.wait(900);
        }
        focusCol(null);
      },
    },
    {
      title: 'Safe path: verify, then open a pull request', who: 'human', tab: 'actions', focus: ['verify', 'pr'],
      text: 'Even safe findings get a quick second look. Then Jonas opens one small PR with only the safe removals.',
      async run(c) {
        await c.edge('e_safe_verify');
        c.activate(['verify']);
        await cmd(c, 'grep -rn "lodash" src config test');
        out('<span class="grey">src/services/bookingService.js:4: // const _ = require(\'lodash\')</span>');
        if (!c.instant) await c.wait(700);
        await c.edge('e_verify_pr');
        c.activate(['pr']);
        await cmd(c, 'git switch -c chore/remove-dead-code');
        block('#blkPr');
        if (!c.instant) await c.wait(600);
        await addDiff(KK.diffBase, c);
      },
    },
    {
      title: 'Unsure path: find who owns the answer', who: 'human', tab: 'findings', focus: ['unsure', 'who'],
      text: 'Some things only people can decide: finance for the CSV export, the product owner for the new calendar.',
      async run(c) {
        await c.edge('e_unsure_who');
        c.activate(['who']);
        focusCol('unsure');
        if (!c.instant) await c.wait(1200);
      },
    },
    {
      title: 'Ask the people who know', who: 'human', tab: 'actions', focus: ['ask_owner'],
      text: 'Jonas asks two specific questions instead of guessing.',
      async run(c) {
        focusCol(null);
        await c.edge('e_who_ask');
        c.activate(['ask_owner']);
        block('#blkMsgs');
        if (!c.instant) await c.wait(500);
        await addMsg('me', 'Is the CSV export in legacyCsv.js still needed? The 2021 TODO says to ask you.', '', c, 'Jonas → Finance');
        await addMsg('me', 'The new calendar pilot has been off since 2021. Will it ship?', '', c, 'Jonas → Product owner');
      },
    },
    {
      title: 'Finance confirms: legacyCsv.js joins the PR', who: 'human', tab: 'actions', focus: ['ans', 'pr'],
      text: 'A confirmed answer turns an uncertain finding into a safe one. The file goes, and moment goes with it.',
      async run(c) {
        await c.edge('e_ask_ans');
        c.activate(['ans']);
        await typing(c, 'Finance', 1800);
        await addMsg('them', 'Not needed since the payroll integration took over in 2021. Go ahead.', 'ok', c, 'Finance');
        await c.edge('e_ans_pr');
        c.activate(['pr']);
        await addDiff(KK.diffFinance, c);
        fileClass('src/utils/legacyCsv.js', 'removed');
        badge('src/utils/legacyCsv.js', 'deleted in PR', 'green', c);
        c.tab('findings');
        if (!c.instant) await c.wait(600);
        moveCard('legacyCsv', 'safe', '✓ finance confirmed → in PR', '', c.instant);
        if (!c.instant) await c.wait(1400);
      },
    },
    {
      title: 'No answer means keep', who: 'human', tab: 'actions', focus: ['ans', 'keep'],
      text: 'The product owner does not reply. The default is the safe one: nyKalender stays until someone with authority says otherwise.',
      async run(c) {
        c.activate(['ans']);
        await typing(c, 'Product owner', 2200);
        await addMsg('them', 'No reply after 5 days → default: keep.', 'silent', c, 'Product owner');
        await c.edge('e_ans_keep');
        c.activate(['keep']);
        c.tab('findings');
        if (!c.instant) await c.wait(600);
        moveCard('nyKalender', 'keep', 'no answer → keep', 'keep', c.instant);
        if (!c.instant) await c.wait(1400);
      },
    },
    {
      title: 'Checks gate the merge', who: 'human', tab: 'actions', focus: ['tests', 'merge'],
      text: 'Tests and lint run on the whole PR. If they failed, the flow would loop back to the review, because something was in use after all.',
      async run(c) {
        await c.edge('e_pr_tests');
        c.activate(['tests']);
        block('#blkChecks');
        scrollEnd('actions');
        await cmd(c, 'npm test');
        if (!c.instant) await c.wait(1200);
        $('#chkTest').classList.add('ok');
        out('<span class="ok">✓ tests passed (illustrative)</span>');
        await cmd(c, 'npm run lint');
        if (!c.instant) await c.wait(1000);
        $('#chkLint').classList.add('ok');
        out('<span class="ok">✓ no lint problems (illustrative)</span>');
        if (!c.instant) await c.wait(500);
        await c.edge('e_tests_merge');
        c.activate(['merge']);
      },
    },
    {
      title: 'Control question before touching the payroll function', who: 'agent', tab: 'actions', focus: ['keep', 'ask2'],
      text: 'Before anyone goes near formaterBookingForLonn, Jonas asks the agent directly. It answers Behold, with the README and code comment as evidence.',
      async run(c) {
        await c.edge('e_keep_ask2');
        c.activate(['ask2']);
        block('#blkQa');
        scrollEnd('actions');
        await cmd(c, 'npm start -- "Er formaterBookingForLonn trygg å fjerne?"');
        await tool(c, 'finn_referanser', '{"navn":"formaterBookingForLonn"}', 147);
        await tool(c, 'sok_i_repo', '{"monster":"formaterBookingForLonn"}', 226);
        await tool(c, 'sok_i_repo', '{"monster":"lonn"}', 426);
        await tool(c, 'hent_git_historikk', '{"fil":"src/services/bookingService.js"}', 1026);
        await tool(c, 'les_fil', '{"fil":"src/services/bookingService.js"}', 2804);
        out('<span class="hl">Dom: Behold</span>');
        out('<span class="grey">3 runder, 5 verktøykall, 9951 tokens inn, 1223 tokens ut</span>');
        $('#qaAnswer').classList.add('in');
        if (!c.instant) { scrollEnd('actions'); await c.wait(1500); }
      },
    },
    {
      title: 'Document why it stays', who: 'human', tab: 'actions', focus: ['doc'],
      text: 'The reason is written down in the repo, so the next person does not have to rediscover it.',
      async run(c) {
        await c.edge('e_ask2_doc');
        c.activate(['doc']);
        block('#blkDoc');
        if (!c.instant) { scrollEnd('actions'); await c.wait(1200); }
      },
    },
    {
      title: 'Result', who: 'human', tab: 'result', focus: ['done', 'merge', 'doc'],
      text: 'Fewer dependencies, a concrete question parked with an owner, and no trap deleted. The agent never edited a file.',
      async run(c) {
        await c.edges(['e_merge_done', 'e_doc_done']);
        c.activate(['done']);
        await revealStats(c);
      },
    },
  ];

  /* ---------- context: each step's helpers ---------- */

  function makeCtx() {
    const c = { cancelled: false, instant: false };
    c.wait = (ms) => (c.instant ? Promise.resolve() : new Promise((res, rej) => {
      setTimeout(() => (c.cancelled ? rej(CANCEL) : res()), ms / speed);
    }));
    c.edge = (id) => flow.edge(id, c.instant, speed);
    c.edges = (ids) => Promise.all(ids.map((id) => flow.edge(id, c.instant, speed)));
    c.activate = (ids) => flow.setActive(ids);
    c.chip = (id, state) => flow.setChip(id, state);
    c.tab = (name) => showTab(name);
    c.reveal = async (sel, gap = 420) => {
      for (const n of $$(sel)) {
        n.classList.add('in');
        if (!c.instant) await c.wait(gap);
      }
    };
    return c;
  }

  /* ---------- player ---------- */

  function setCaption(s, i) {
    $('#stepCount').textContent = `${i + 1} / ${steps.length}`;
    for (const [id, text] of [['capTitle', s.title], ['capText', s.text]]) {
      const old = $('#' + id);
      const n = old.cloneNode(false);
      n.textContent = text;
      old.replaceWith(n);
    }
    $$('#timeline li').forEach((li, k) => {
      li.classList.toggle('past', k < i);
      li.classList.toggle('now', k === i);
    });
  }

  function resetStage() {
    $$('.rv').forEach((n) => n.classList.remove('in'));
    buildTree();
    buildPackages();
    buildCards();
    buildStats();
    resetActions();
    $('#term').innerHTML = '';
  }

  async function applyStep(i, c, instant) {
    const s = steps[i];
    c.instant = instant;
    showTab(s.tab);
    flow.focus(s.focus, instant);
    if (!instant) setCaption(s, i);
    await s.run(c);
  }

  async function goTo(i) {
    if (i < 0 || i >= steps.length) return;
    if (ctx) ctx.cancelled = true;
    const c = (ctx = makeCtx());
    const sequential = i === index + 1 && stepDone;
    index = i;
    stepDone = false;
    try {
      if (!sequential) {
        flow.reset();
        resetStage();
        for (let j = 0; j < i; j++) await applyStep(j, c, true);
      }
      await applyStep(i, c, false);
      stepDone = true;
      if (playing) {
        if (i === steps.length - 1) return setPlaying(false);
        await c.wait(steps[i].dwell || 2600);
        if (playing) goTo(i + 1);
      }
    } catch (e) {
      if (e !== CANCEL) console.error(e);
    }
  }

  function setPlaying(on) {
    playing = on;
    $('#btnPlay').textContent = on ? '⏸ Pause' : (index >= steps.length - 1 && stepDone ? '↺ Replay' : '▶ Play');
  }

  function togglePlay() {
    if (playing) return setPlaying(false);
    if (index >= steps.length - 1 && stepDone) { setPlaying(true); return goTo(0); }
    setPlaying(true);
    if (stepDone) goTo(index + 1);
  }

  function buildTimeline() {
    const ol = $('#timeline');
    ol.innerHTML = '';
    steps.forEach((s, i) => {
      const li = document.createElement('li');
      li.dataset.who = s.who;
      li.title = `${i + 1}. ${s.title}`;
      li.innerHTML = '<b></b>';
      li.addEventListener('click', () => { setPlaying(false); goTo(i); });
      ol.appendChild(li);
    });
  }

  function init() {
    buildTabs();
    buildTimeline();
    flow.build($('#flow'));

    $('#btnPlay').addEventListener('click', togglePlay);
    $('#btnNext').addEventListener('click', () => { setPlaying(false); goTo(Math.min(steps.length - 1, index + 1)); });
    $('#btnPrev').addEventListener('click', () => { setPlaying(false); goTo(Math.max(0, index - 1)); });
    $('#btnRestart').addEventListener('click', () => { setPlaying(false); goTo(0); });
    $('#speed').addEventListener('change', (e) => { speed = Number(e.target.value); });
    $('#followBtn').addEventListener('click', toggleFollow);

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight') $('#btnNext').click();
      else if (e.key === 'ArrowLeft') $('#btnPrev').click();
      else if (e.key === 'Home') $('#btnRestart').click();
      else if (e.key === 'f' || e.key === 'F') toggleFollow();
    });

    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => index >= 0 && flow.focus(steps[index].focus, true), 150);
    });

    // Step 1 is shown ready to play. Nothing starts until the presenter presses Play.
    goTo(0);
    setPlaying(false);
  }

  function toggleFollow() {
    KK.follow = !KK.follow;
    $('#followBtn').classList.toggle('on', KK.follow);
    if (index >= 0) flow.focus(steps[index].focus, false);
  }

  KK.steps = steps;
  KK.goTo = goTo;
  init();
})(window.KK);
