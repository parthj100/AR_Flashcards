// === Lens prototype — router + views ===
const D = window.LENS_DATA;
const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

// Each deck opens to a representative flashcard. Edit here to add more.
const DECK_TO_CARD = {
  'chem-101':     'copper-sulfate',
  'biology-cell': 'mitochondria',
  'arch-survey':  'hagia-sophia',
  'botany-lab':   'maple-leaf',
  'mineral-id':   'quartz',
  'renaissance':  'mona-lisa',
  'mechanics':    'newtons-laws',
  'solar-system': 'jupiter',
};
const cardForDeck = (deckId) => DECK_TO_CARD[deckId] || 'copper-sulfate';

// ---------- Router ----------
const routes = {
  '': renderDashboard,
  '#dashboard': renderDashboard,
  '#decks': renderDecks,
  '#scan': renderScan,
  '#flashcard': renderFlashcard, // takes ?id=
};

function parseHash() {
  const raw = window.location.hash || '';
  const [path, query] = raw.split('?');
  const params = new URLSearchParams(query || '');
  return { path, params };
}

function navigate(hash) {
  if (window.location.hash === hash) return; // no-op
  window.location.hash = hash;
}

window.addEventListener('hashchange', mount);
window.addEventListener('DOMContentLoaded', mount);

function mount() {
  const { path, params } = parseHash();
  const view = routes[path] || renderDashboard;
  const root = $('#app');
  root.innerHTML = '';
  view(root, params);
  attachGlobalKeys();
}

// ---------- Sidebar (shared on light pages) ----------
function renderSidebar(active) {
  const decksHtml = D.myDecks.map(d => `
    <button class="deck-pill" data-deck="${d.id}">
      <span class="deck-dot" style="background:${d.dot}"></span>
      <span>${d.name}</span>
      <span class="count">${d.count}</span>
    </button>`).join('');

  return `
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark"></div>
      <div class="brand-name">LENS</div>
    </div>

    <button class="new-scan" data-action="new-scan">
      <span class="scan-icon"></span>
      <span class="label">New scan</span>
      <span class="kbd">⌘ S</span>
    </button>

    <div class="nav-section-label">Workspace</div>
    <nav class="nav">
      <button class="nav-item ${active==='dashboard'?'active':''}" data-route="#dashboard">
        ${ico('home')}<span>Home</span>
      </button>
      <button class="nav-item ${active==='decks'?'active':''}" data-route="#decks">
        ${ico('decks')}<span>Decks</span><span class="count">14</span>
      </button>
      <button class="nav-item" data-route="#dashboard">
        ${ico('clock')}<span>Review</span><span class="badge">12</span>
      </button>
      <button class="nav-item" data-route="#dashboard">
        ${ico('chart')}<span>Stats</span>
      </button>
      <button class="nav-item" data-route="#dashboard">
        ${ico('chat')}<span>Tutor chat</span><span class="tag">Beta</span>
      </button>
    </nav>

    <div class="nav-section-label">My decks
      <button class="add-btn" title="Add deck">+</button>
    </div>
    <div class="deck-list">${decksHtml}</div>

    <div class="sidebar-footer">
      <div class="avatar">${D.user.initials}</div>
      <div>
        <div class="user-name">${D.user.name}</div>
        <div class="user-meta">${D.user.plan}</div>
      </div>
      <button class="dots-btn" title="Account">${ico('dots')}</button>
    </div>
  </aside>`;
}

// ---------- Topbar (shared) ----------
function renderTopbar({ withSearch = true, rightSlot = '' } = {}) {
  return `
  <header class="topbar">
    ${withSearch ? `
      <div class="search" data-action="open-search">
        ${ico('search')}
        <input placeholder="Search cards, decks, formulas…" readonly />
        <span class="kbd-shortcut"><kbd>⌘</kbd><kbd>K</kbd></span>
      </div>` : ''}
    <div class="spacer"></div>
    ${rightSlot}
  </header>`;
}

// ---------- Dashboard (W1) ----------
function renderDashboard(root) {
  const right = `
    <button class="btn">${ico('plus')} Invite classmate</button>
    <button class="btn btn-icon" title="Notifications">${ico('bell')}</button>
    <button class="btn btn-primary"><span class="dot"></span>Upgrade</button>
  `;

  const scansHtml = D.recentScans.map(s => `
    <button class="scan-card" data-scan="${s.id}">
      <div class="scan-cover" style="background:${s.grad}">
        <div class="blob"></div>
        <div class="tag-pill">${s.tag}</div>
      </div>
      <div class="scan-meta">
        <div class="scan-title">${s.title}</div>
        <div class="scan-sub">${s.sub}</div>
        <div class="scan-row">
          <span>${s.when} · ${s.cards} cards</span>
          <span class="scan-status status-${s.status}">${s.status.toUpperCase()}</span>
        </div>
      </div>
    </button>`).join('');

  const dueHtml = D.dueToday.map(d => `
    <div class="due-item ${d.now ? 'is-now' : ''}">
      <div class="due-bar"></div>
      <div class="due-info">
        <div class="due-title">${d.title}</div>
        <div class="due-sub">${d.sub}</div>
      </div>
      <div class="due-when">${d.when}</div>
    </div>`).join('');

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('dashboard')}
      <div class="main">
        ${renderTopbar({ rightSlot: right })}
        <div class="dash">
          <div class="dash-header">
            <div>
              <div class="eyebrow">Tuesday · April 27</div>
              <h1 class="greeting">Good morning, Parth.</h1>
            </div>
            <div class="dash-actions">
              <button class="btn">${ico('import')} Import</button>
              <button class="btn btn-accent" data-route="#dashboard"><span class="dot"></span>Start review · 12 due</button>
            </div>
          </div>

          <section class="kpis">
            <div class="kpi">
              <div class="kpi-label">Cards captured</div>
              <div class="kpi-value">147 <span class="delta">+18 this wk</span></div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Retention rate</div>
              <div class="kpi-value">86% <span class="sub">last 30 days</span></div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Time studied</div>
              <div class="kpi-value">4.2h <span class="sub">this week</span></div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Streak</div>
              <div class="kpi-value"><span class="hl">7</span> days <span class="sub">personal best: 14</span></div>
            </div>
          </section>

          <section class="dash-grid">
            <div>
              <div class="section-head">
                <div class="section-title">Recent scans <span class="sub">— this week</span></div>
                <div class="tabs">
                  <button class="tab active">All</button>
                  <button class="tab">Biology</button>
                  <button class="tab">Chemistry</button>
                  <button class="tab">Architecture</button>
                </div>
              </div>
              <div class="scan-grid">${scansHtml}</div>
            </div>
            <div>
              <div class="due-head">
                <div class="section-title">Due today</div>
                <div class="count">12 cards</div>
              </div>
              <div class="due-list">${dueHtml}</div>
            </div>
          </section>
        </div>
      </div>
    </div>`;

  // Tabs (recent scans filter)
  root.querySelectorAll('.tabs .tab').forEach(t => t.addEventListener('click', () => {
    root.querySelectorAll('.tabs .tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const sel = t.textContent.trim().toLowerCase();
    const map = { biology: 'bio', chemistry: 'chem', architecture: 'arch', botany: 'bot' };
    root.querySelectorAll('.scan-card').forEach(c => {
      const id = c.dataset.scan;
      const item = D.recentScans.find(s => s.id === id);
      const subject = item.subject;
      c.style.display = (sel === 'all' || map[sel] === subject) ? '' : 'none';
    });
  }));
}

// ---------- Decks Browse (W4) ----------
function renderDecks(root) {
  const right = `
    <button class="btn">${ico('sort')} Sort: Recently used</button>
    <button class="btn btn-primary">${ico('plus')} New deck</button>
  `;

  const cardsHtml = (filter) => D.decks
    .filter(d => filter === 'all' ? true : d.status.toLowerCase().replace(/\s+/g,'') === filter)
    .map(d => `
      <button class="deck-card" data-deck="${d.id}">
        <div class="deck-cover" style="background:${d.grad}">
          <div class="blob"></div>
          <div class="tag-pill">${d.status}</div>
        </div>
        <div class="deck-body">
          <div class="deck-eyebrow">${d.subject}</div>
          <div class="deck-name">${d.name}</div>
          <div class="deck-desc">${d.desc}</div>
        </div>
        <div class="deck-foot">
          <div class="deck-stat"><div class="v">${d.cards}</div><div class="l">cards</div></div>
          <div class="deck-stat"><div class="v">${d.due}</div><div class="l">due</div></div>
          <div class="study">Study ${ico('arrow')}</div>
        </div>
      </button>`).join('');

  const counts = {
    all: D.decks.length,
    active: D.decks.filter(d => d.status === 'ACTIVE').length,
    shared: D.decks.filter(d => d.status === 'SHARED').length,
    archived: D.decks.filter(d => d.status === 'ARCHIVED').length,
  };

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('decks')}
      <div class="main">
        ${renderTopbar({ rightSlot: right })}
        <div class="decks-page">
          <div class="decks-meta">${D.decks.length} decks · 147 cards</div>
          <h1 class="decks-title">Your decks.</h1>
          <div class="decks-tabs">
            <button class="decks-tab active" data-filter="all">All <span class="num">${counts.all}</span></button>
            <button class="decks-tab" data-filter="active">Active <span class="num">${counts.active}</span></button>
            <button class="decks-tab" data-filter="shared">Shared with me <span class="num">${counts.shared}</span></button>
            <button class="decks-tab" data-filter="archived">Archived <span class="num">${counts.archived}</span></button>
          </div>
          <div class="decks-grid" id="decks-grid">${cardsHtml('all')}</div>
        </div>
      </div>
    </div>`;

  root.querySelectorAll('.decks-tab').forEach(t => t.addEventListener('click', () => {
    root.querySelectorAll('.decks-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('#decks-grid', root).innerHTML = cardsHtml(t.dataset.filter);
  }));
}

// ---------- Scan (W2) ----------
function renderScan(root) {
  // pick a "current" specimen from recents
  const current = D.recentScans[0]; // copper sulfate
  const alts = [
    { mark: 'Cl', name: 'Cobalt chloride', formula: 'CoCl₂',          pct: '5%' },
    { mark: 'Az', name: 'Azurite',         formula: 'Cu₃(CO₃)₂(OH)₂', pct: '2%' },
  ];

  root.innerHTML = `
    <div class="scan-page">
      <section class="scan-stage">
        <div class="scan-backdrop"></div>

        <div class="scan-top">
          <button class="back" data-route="#dashboard">${ico('chev-left')} Back</button>
          <div class="divider"></div>
          <div class="scoping">Scanning to</div>
          <div class="deck-pill-dark"><span class="dot"></span>Chem 101 ${ico('chev-down')}</div>
          <div class="right-tools">
            <span class="tool-pill"><span class="live"></span>Auto-detect</span>
            <span class="tool-pill">${ico('bolt')} Flash off</span>
            <button class="tool-pill close" data-route="#dashboard">${ico('x')}</button>
          </div>
        </div>

        <div class="reticle">
          <span class="corner tl"></span>
          <span class="corner tr"></span>
          <span class="corner bl"></span>
          <span class="corner br"></span>
          <div class="specimen">
            <div class="blob"></div>
            <div class="focal"></div>
          </div>
        </div>

        <div class="scan-detection-pill">
          <span class="check">${ico('check')}</span>
          <span>Copper sulfate</span>
          <span class="pct">92%</span>
          <span class="stem"></span>
        </div>

        <div class="scan-bottom">
          <div class="recognized">Recognized — press space or click to capture</div>
          <div class="formula">CuSO4 · 5H2O</div>
          <div class="capture-row">
            <div class="capture-aux">
              <button class="icon-btn" title="Upload">${ico('image')}</button>
              <span>Upload</span>
            </div>
            <div class="capture-stack">
              <button class="capture-btn" id="capture-btn" title="Capture"></button>
              <div class="capture-btn-label">CAPTURE · SPACE</div>
            </div>
            <div class="capture-aux">
              <button class="icon-btn" title="Settings">${ico('gear')}</button>
              <span>Settings</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="detection-panel">
        <div class="live-label">Live detection</div>
        <div>
          <div class="detection-name">Copper sulfate</div>
          <div class="detection-formula">
            <span class="strong">CuSO₄</span><span>·</span><span class="strong">5H₂O</span><span>·</span><span>inorganic salt</span>
          </div>
        </div>
        <div>
          <div class="confidence-row">
            <span class="label">Confidence</span>
            <span class="v" id="confidence-pct">92%</span>
          </div>
          <div class="confidence-bar"><span id="confidence-fill" style="width:92%"></span></div>
        </div>

        <div class="alt-section">
          <div class="alt-label">Other possibilities</div>
          ${alts.map(a => `
            <div class="alt-row">
              <div class="alt-mark">${a.mark}</div>
              <div class="alt-info">
                <div class="alt-name">${a.name}</div>
                <div class="alt-sub">${a.formula}</div>
              </div>
              <div class="alt-pct">${a.pct}</div>
            </div>`).join('')}
          <div class="alt-row">
            <div class="alt-mark">??</div>
            <div class="alt-info">
              <div class="alt-name">Not what you mean?</div>
              <div class="alt-sub" style="font-family:var(--font-sans)">Type it manually</div>
            </div>
            <span class="arrow">${ico('chev-right')}</span>
          </div>
        </div>

        <div class="session-row">
          <div class="label-line">
            <span class="l">This session</span>
            <span class="v">3 captures</span>
          </div>
          <div class="session-thumbs">
            <div class="session-thumb" style="background:var(--grad-orange)"><span class="name">Mito.</span></div>
            <div class="session-thumb" style="background:var(--grad-arch)"><span class="name">Hagia</span></div>
            <div class="session-thumb" style="background:var(--grad-amber)"><span class="name">Maple</span></div>
          </div>
        </div>

        <div class="tip-card">
          <div class="head">When you capture</div>
          <div class="body">Lens will generate a flashcard with definition, key facts, and quiz prompts.</div>
          <div class="foot">Card saves to Chem 101 automatically.</div>
        </div>
      </aside>
    </div>`;

  // Capture interaction → simulate detection then go to the flashcard
  const capture = () => {
    const btn = $('#capture-btn', root);
    if (!btn) return;
    btn.style.transform = 'scale(.92)';
    setTimeout(() => { btn.style.transform = ''; }, 120);
    setTimeout(() => navigate('#flashcard?id=copper-sulfate'), 200);
  };
  $('#capture-btn', root).addEventListener('click', capture);

  // Animate confidence wobble for liveness
  let p = 92;
  const fill = $('#confidence-fill', root);
  const pct = $('#confidence-pct', root);
  const wobble = setInterval(() => {
    p = Math.max(88, Math.min(95, p + (Math.random() * 2 - 1)));
    fill.style.width = p.toFixed(0) + '%';
    pct.textContent = p.toFixed(0) + '%';
  }, 600);
  // clean up on next mount
  const obs = new MutationObserver(() => { if (!document.body.contains(fill)) { clearInterval(wobble); obs.disconnect(); }});
  obs.observe(document.body, { childList: true, subtree: true });

  // Space to capture
  document.onkeydown = (e) => {
    if (e.code === 'Space' && !$('#search-overlay').hidden === false) { e.preventDefault(); capture(); }
  };
}

// ---------- Flashcard detail (W3) ----------
function renderFlashcard(root, params) {
  const id = params.get('id') || 'copper-sulfate';
  const card = D.flashcards[id] || D.flashcards['copper-sulfate'];

  const right = `
    <button class="btn">${ico('share')} Share</button>
    <button class="btn btn-primary"><span class="dot"></span>Quiz me</button>
  `;

  const factsHtml = card.facts.map(f => `
    <div class="fact">
      <div><span class="fact-num">${f.num}</span><span class="fact-label">${f.label}</span></div>
      <div class="fact-body">${f.body}</div>
    </div>`).join('');

  const progressPct = (card.reviewProgress.done / card.reviewProgress.total) * 100;

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('')}
      <div class="main">
        ${renderTopbar({ withSearch: false, rightSlot: `
          <div class="crumbs" style="margin-right:auto">
            <span>${card.crumbs[0]}</span><span class="sep">›</span>
            <span>${card.crumbs[1]}</span><span class="sep">›</span>
            <span class="now">${card.name}</span>
          </div>
          ${right}
        ` })}
        <div class="detail-page">
          <div class="detail-grid">
            <div>
              <div class="card-cover" style="background:${card.grad}">
                <div class="scan-tag">${card.scanned}</div>
                <div class="blob"></div>
                <div class="pager">
                  <span class="pip active"></span>
                  <span class="pip"></span>
                  <span class="pip"></span>
                </div>
              </div>
              <div class="repetition">
                <div class="label">Spaced repetition</div>
                <div class="when">${card.reviewWhen} <span class="at">${card.reviewAt}</span></div>
                <div class="progress"><span style="width:${progressPct}%"></span></div>
                <div class="progress-meta">
                  <span>Reviews</span>
                  <span>${card.reviewProgress.done} / ${card.reviewProgress.total}</span>
                </div>
              </div>
            </div>

            <div>
              <div class="subject-eyebrow">
                ${card.subject.split(' · ').map((s,i,a) => `<span>${s}</span>${i<a.length-1?'<span class="dot">·</span>':''}`).join('')}
              </div>
              <h1 class="subject-name"><span class="hl">${card.name}</span></h1>
              <div class="subject-formula"><span>${card.formula}</span><span class="mass">${card.mass}</span></div>
              <div class="detail-tabs">
                <button class="detail-tab active" data-tab="overview">Overview</button>
                <button class="detail-tab" data-tab="notes">Notes</button>
                <button class="detail-tab" data-tab="quiz">Quiz history</button>
                <button class="detail-tab" data-tab="sources">Sources</button>
              </div>
              <div class="tab-panel" id="panel">
                <div class="oneline">In one line</div>
                <p class="oneline-text">${card.oneline}</p>
                <div class="fact-grid">${factsHtml}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Tab switching
  root.querySelectorAll('.detail-tab').forEach(t => t.addEventListener('click', () => {
    root.querySelectorAll('.detail-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.dataset.tab;
    if (tab === 'overview') {
      $('#panel', root).innerHTML = `
        <div class="oneline">In one line</div>
        <p class="oneline-text">${card.oneline}</p>
        <div class="fact-grid">${factsHtml}</div>`;
    } else if (tab === 'notes') {
      $('#panel', root).innerHTML = `
        <div class="oneline">Your notes</div>
        <p class="oneline-text">No notes yet — press <kbd>N</kbd> to start writing.</p>`;
    } else if (tab === 'quiz') {
      $('#panel', root).innerHTML = `
        <div class="oneline">Quiz history</div>
        <p class="oneline-text">${card.reviewProgress.done} sessions complete · 100% retention so far.</p>`;
    } else {
      $('#panel', root).innerHTML = `
        <div class="oneline">Sources</div>
        <p class="oneline-text">Captured by Lens AR · matched against the open-source Wikidata + ChemSpider corpus.</p>`;
    }
  }));

  // Pager pips - cycle on click
  const pips = root.querySelectorAll('.pager .pip');
  pips.forEach((p, i) => p.addEventListener('click', () => {
    pips.forEach(x => x.classList.remove('active'));
    p.classList.add('active');
  }));
}

// ---------- Global delegation: routing, search, deck clicks ----------
document.addEventListener('click', (e) => {
  const route = e.target.closest('[data-route]');
  if (route) { navigate(route.dataset.route); return; }
  const newScan = e.target.closest('[data-action="new-scan"]');
  if (newScan) { navigate('#scan'); return; }
  const scanCard = e.target.closest('[data-scan]');
  if (scanCard) { navigate(`#flashcard?id=${scanCard.dataset.scan}`); return; }
  const deckCard = e.target.closest('[data-deck]');
  if (deckCard) {
    navigate(`#flashcard?id=${cardForDeck(deckCard.dataset.deck)}`);
    return;
  }
  const openSearch = e.target.closest('[data-action="open-search"]');
  if (openSearch) { openSearchOverlay(); }
});

// ---------- Search overlay ----------
function openSearchOverlay() {
  const overlay = $('#search-overlay');
  const input = $('#search-input');
  overlay.hidden = false;
  input.value = '';
  renderSearchResults('');
  setTimeout(() => input.focus(), 0);
}
function closeSearchOverlay() { $('#search-overlay').hidden = true; }

function searchCorpus(q) {
  q = q.trim().toLowerCase();
  const items = [
    ...D.recentScans.map(s => ({ kind: 'card', id: s.id, title: s.title, sub: s.sub, swatch: s.grad })),
    ...D.decks.map(d => ({ kind: 'deck', id: d.id, title: d.name, sub: d.subject, swatch: d.grad })),
  ];
  if (!q) return items.slice(0, 6);
  return items.filter(i => i.title.toLowerCase().includes(q) || (i.sub||'').toLowerCase().includes(q)).slice(0, 8);
}

function renderSearchResults(q) {
  const list = $('#search-results');
  const items = searchCorpus(q);
  list.innerHTML = items.map((i, idx) => `
    <button class="search-result ${idx===0?'is-active':''}" data-kind="${i.kind}" data-id="${i.id}">
      <div class="swatch" style="background:${i.swatch}"></div>
      <div>
        <div class="title">${i.title}</div>
      </div>
      <span class="sub">${i.sub || ''}</span>
    </button>`).join('') || `<div class="search-result"><span class="sub">No matches.</span></div>`;
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') renderSearchResults(e.target.value);
});
document.addEventListener('click', (e) => {
  const r = e.target.closest('.search-result');
  if (!r) return;
  const kind = r.dataset.kind;
  const id = r.dataset.id;
  closeSearchOverlay();
  if (kind === 'card') navigate(`#flashcard?id=${id}`);
  if (kind === 'deck') navigate(`#flashcard?id=${cardForDeck(id)}`);
});

// ---------- Global keys ----------
function attachGlobalKeys() {
  document.onkeydown = (e) => {
    const overlay = $('#search-overlay');
    const overlayOpen = !overlay.hidden;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearchOverlay(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); navigate('#scan'); return; }
    if (e.key === 'Escape') { if (overlayOpen) { closeSearchOverlay(); return; } }
    if (e.code === 'Space' && window.location.hash === '#scan' && !overlayOpen) {
      e.preventDefault();
      const btn = $('#capture-btn');
      btn && btn.click();
      return;
    }
    if (overlayOpen && (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const items = Array.from(document.querySelectorAll('.search-result'));
      let idx = items.findIndex(x => x.classList.contains('is-active'));
      if (e.key === 'Enter') { items[idx]?.click(); return; }
      idx = Math.max(0, Math.min(items.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)));
      items.forEach(x => x.classList.remove('is-active'));
      items[idx]?.classList.add('is-active');
      e.preventDefault();
    }
  };
}

// click outside overlay closes it
$('#search-overlay').addEventListener('click', (e) => { if (e.target.id === 'search-overlay') closeSearchOverlay(); });

// ---------- Icons ----------
function ico(name) {
  const m = {
    home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1v-9"/></svg>`,
    decks: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="18" rx="1.5"/><rect x="13" y="3" width="8" height="18" rx="1.5"/></svg>`,
    clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 9 11l4 4 8-8"/><path d="M21 7v4h-4"/></svg>`,
    chat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 1 1-3.5-6.6L21 4l-1.4 3.5A8 8 0 0 1 21 12Z"/></svg>`,
    dots: `<svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/></svg>`,
    search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
    plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
    bell: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
    import: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8" opacity=".4"/></svg>`,
    sort: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M6 12h12M9 18h6"/></svg>`,
    arrow: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,
    'chev-left': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`,
    'chev-right': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
    'chev-down': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    bolt: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>`,
    x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    image: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>`,
    gear: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.4 7.4 0 0 0 0-3l2.1-1.6-2-3.5-2.5.9a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.7a7.6 7.6 0 0 0-2.6 1.5l-2.5-.9-2 3.5L4.6 10.5a7.4 7.4 0 0 0 0 3l-2.1 1.6 2 3.5 2.5-.9a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.7a7.6 7.6 0 0 0 2.6-1.5l2.5.9 2-3.5z"/></svg>`,
    share: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/></svg>`,
    check: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>`
  };
  return m[name] || '';
}
