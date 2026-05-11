// === Lens prototype — router + views ===
const D = window.LENS_DATA;
const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

// Runtime state (outlives view mounts)
const RT = window.LENS_RUNTIME = window.LENS_RUNTIME || {
  mlReady: false,       // true once CLIP has downloaded and indexed vocab
  mlError: null,        // string error if ML failed to init
  ollamaOk: false,      // true after a successful Ollama health check
  yoloOk: false,        // true after successful /health from the YOLO server
  scanMode: (function () {
    try { return localStorage.getItem('lens.scanMode') || 'single'; } catch { return 'single'; }
  })(),
  generatedCards: {},   // id -> flashcard object produced by LLM
  scan: null,           // active scan controller (camera + loop)
  captures: [],         // newest-first: { id, topic, subject, grad, when, isGenerated }
  quizSessions: [],     // newest-first: { cardId, correct, total, at }
  sessionStart: Date.now(),
};

function setScanMode(mode) {
  RT.scanMode = mode === 'multi' ? 'multi' : 'single';
  try { localStorage.setItem('lens.scanMode', RT.scanMode); } catch {}
}

// Merge a fresh capture into the recent feed (newest first, dedupe by id).
function recordCapture({ id, meta, isGenerated }) {
  const now = Date.now();
  RT.captures = RT.captures.filter(c => c.id !== id);
  RT.captures.unshift({
    id,
    topic: meta.displayName,
    subject: meta.subject || '',
    grad: meta.grad || 'var(--grad-physics)',
    when: now,
    isGenerated: !!isGenerated,
  });
}

// Human-readable "just now / 3m ago / 2h ago / yesterday / N days ago".
function relativeTime(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
}

// First 3 letters of display name for scan-card tag.
function shortTag(s) {
  return (s || '').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'NEW';
}

// Build the full vocabulary CLIP should recognize = hand-authored flashcards
// that have clipPrompts[] + extendedVocab entries. Returned in a flat shape.
function buildVocabulary() {
  const vocab = [];
  for (const [id, card] of Object.entries(D.flashcards)) {
    if (Array.isArray(card.clipPrompts) && card.clipPrompts.length) {
      vocab.push({ id, prompts: card.clipPrompts });
    }
  }
  for (const v of (D.extendedVocab || [])) {
    vocab.push({ id: v.id, prompts: v.prompts });
  }
  return vocab;
}

// Look up a vocabulary entry by id. Returns a unified shape regardless of
// whether it came from flashcards{} or extendedVocab[].
function vocabMeta(id) {
  if (D.flashcards[id]) {
    const c = D.flashcards[id];
    return { id, displayName: c.name, subject: c.subject, grad: c.grad, kind: 'authored' };
  }
  const v = (D.extendedVocab || []).find(x => x.id === id);
  if (v) return { id, displayName: v.displayName, subject: v.subject, grad: v.grad, kind: 'extended' };
  return null;
}

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
  '#quiz': renderQuiz,            // takes ?id= (single card) or ?mode=review
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

window.addEventListener('hashchange', () => {
  // Stop the camera if we're leaving the scan view
  if (window.location.hash !== '#scan' && RT.scan) {
    try { RT.scan.stop(); } catch (_) {}
    RT.scan = null;
  }
  mount();
});
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
        ${ico('decks')}<span>Decks</span><span class="count">${D.decks.length}</span>
      </button>
      <button class="nav-item" data-route="#dashboard">
        ${ico('clock')}<span>Review</span><span class="badge">${D.dueToday.length}</span>
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

  // Build "recent scans" from live captures (fresh), falling back to seed data.
  const liveScans = RT.captures.map(c => {
    const authored = D.flashcards[c.id];
    const title = authored?.name || c.topic;
    const sub = authored?.formula || c.subject || (c.isGenerated ? 'Generated by Phi-3' : '');
    return {
      id: c.id,
      title,
      sub,
      when: relativeTime(c.when),
      cards: authored?.facts?.length || 4,
      status: c.isGenerated ? 'new' : 'studying',
      tag: c.isGenerated ? 'AI' : shortTag(title),
      grad: c.grad,
      subject: subjectKeyForCard(c.id),
      isGenerated: c.isGenerated,
    };
  });
  const seedScans = D.recentScans.filter(s => !liveScans.some(l => l.id === s.id));
  const scans = [...liveScans, ...seedScans].slice(0, 9);

  const scansHtml = scans.map(s => `
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
    <div class="due-item ${d.now ? 'is-now' : ''}" data-scan="${d.id}">
      <div class="due-bar"></div>
      <div class="due-info">
        <div class="due-title">${d.title}</div>
        <div class="due-sub">${d.sub}</div>
      </div>
      <div class="due-when">${d.when}</div>
    </div>`).join('');

  // KPIs: derived from real activity when possible.
  const kpi = computeKpis();

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar('dashboard')}
      <div class="main">
        ${renderTopbar({ rightSlot: right })}
        <div class="dash">
          <div class="dash-header">
            <div>
              <div class="eyebrow">${todayEyebrow()}</div>
              <h1 class="greeting">${greeting()}, Parth.</h1>
            </div>
            <div class="dash-actions">
              <button class="btn">${ico('import')} Import</button>
              <button class="btn btn-accent" data-action="start-review"><span class="dot"></span>Start review · ${D.dueToday.length} due</button>
            </div>
          </div>

          <section class="kpis">
            <div class="kpi">
              <div class="kpi-label">Cards captured</div>
              <div class="kpi-value">${kpi.captured} <span class="delta">${kpi.capturedDelta}</span></div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Retention rate</div>
              <div class="kpi-value">${kpi.retention}% <span class="sub">last ${kpi.quizCount} quiz${kpi.quizCount===1?'':'zes'}</span></div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Time studied</div>
              <div class="kpi-value">${kpi.timeStudied} <span class="sub">this session</span></div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Streak</div>
              <div class="kpi-value"><span class="hl">${kpi.streak}</span> days <span class="sub">personal best: 14</span></div>
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
                <div class="count">${D.dueToday.length} cards</div>
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
      const item = scans.find(s => s.id === id);
      if (!item) { c.style.display = 'none'; return; }
      c.style.display = (sel === 'all' || map[sel] === item.subject) ? '' : 'none';
    });
  }));
}

// Infer a coarse subject key (chem/bio/arch/bot/...) from a card id so the
// dashboard filter tabs keep working for newly captured cards. Falls back to
// the seed data's `subject` field when present.
function subjectKeyForCard(id) {
  const seed = D.recentScans.find(s => s.id === id);
  if (seed?.subject) return seed.subject;
  const meta = vocabMeta(id);
  const subject = (meta?.subject || '').toLowerCase();
  if (subject.includes('bio') || subject.includes('anatomy') || subject.includes('zool')) return 'bio';
  if (subject.includes('chem')) return 'chem';
  if (subject.includes('arch')) return 'arch';
  if (subject.includes('bot')) return 'bot';
  return '';
}

// Time-of-day greeting.
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
function todayEyebrow() {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

// KPI math — derived from live runtime where possible.
function computeKpis() {
  // "Captured" = authored cards + generated cards + unique live captures
  const livePool = new Set(RT.captures.map(c => c.id));
  for (const id of Object.keys(RT.generatedCards)) livePool.add(id);
  // Seed number (147) represents prior history; we add today's real captures.
  const seedCaptured = 147;
  const newToday = RT.captures.length;
  const captured = seedCaptured + newToday;
  const capturedDelta = newToday > 0 ? `+${newToday} just now` : '+18 this wk';

  // Retention from real quiz sessions, if any.
  let retention = 86, quizCount = 0;
  if (RT.quizSessions.length) {
    const tot = RT.quizSessions.reduce((a, q) => a + q.total, 0);
    const cor = RT.quizSessions.reduce((a, q) => a + q.correct, 0);
    retention = tot ? Math.round((cor / tot) * 100) : 0;
    quizCount = RT.quizSessions.length;
  }

  // Time studied = elapsed session time.
  const minutes = Math.floor((Date.now() - RT.sessionStart) / 60000);
  const timeStudied = minutes >= 60
    ? `${(minutes / 60).toFixed(1)}h`
    : `${Math.max(minutes, 0)}m`;

  const streak = 7;
  return { captured, capturedDelta, retention, quizCount: quizCount || 1, timeStudied, streak };
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

// ---------- Scan (W2) — real CLIP + Ollama pipeline ----------
function renderScan(root) {
  // Stop any prior scan controller before mounting fresh UI
  if (RT.scan) { try { RT.scan.stop(); } catch (_) {} RT.scan = null; }

  root.innerHTML = `
    <div class="scan-page">
      <section class="scan-stage">
        <div class="scan-backdrop"></div>

        <video id="scan-video" class="scan-video" autoplay muted playsinline></video>
        <div class="scan-vignette"></div>

        <div class="scan-top">
          <button class="back" data-route="#dashboard">${ico('chev-left')} Back</button>
          <div class="divider"></div>
          <div class="scoping">Scanning to</div>
          <div class="deck-pill-dark"><span class="dot"></span>Chem 101 ${ico('chev-down')}</div>
          <div class="mode-toggle" role="tablist" aria-label="Scan mode">
            <button class="mode-opt ${RT.scanMode==='single'?'is-active':''}" data-mode="single" role="tab" aria-selected="${RT.scanMode==='single'}">Single</button>
            <button class="mode-opt ${RT.scanMode==='multi'?'is-active':''}" data-mode="multi" role="tab" aria-selected="${RT.scanMode==='multi'}">Multi · YOLO</button>
          </div>
          <div class="right-tools">
            <span class="tool-pill" id="ml-status"><span class="live" id="ml-dot"></span><span id="ml-text">Starting…</span></span>
            <span class="tool-pill ${RT.scanMode==='multi'?'':'is-hidden'}" id="yolo-status"><span class="live" id="yolo-dot" style="background:#8B8B86;box-shadow:none"></span><span id="yolo-text">YOLO</span></span>
            <span class="tool-pill" id="llm-status"><span class="live" id="llm-dot" style="background:#8B8B86;box-shadow:none"></span><span id="llm-text">LLM</span></span>
            <button class="tool-pill close" data-route="#dashboard">${ico('x')}</button>
          </div>
        </div>

        <div class="reticle">
          <span class="corner tl"></span>
          <span class="corner tr"></span>
          <span class="corner bl"></span>
          <span class="corner br"></span>
        </div>

        <div class="scan-detection-pill" id="detection-pill" hidden>
          <span class="check">${ico('check')}</span>
          <span id="detection-name">—</span>
          <span class="pct" id="detection-pct">0%</span>
          <span class="stem"></span>
        </div>

        <div class="scan-bottom">
          <div class="recognized" id="scan-hint">Point the camera at an object and press space to capture</div>
          <div class="formula" id="scan-formula">—</div>
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
          <div class="detection-name" id="panel-name">Warming up…</div>
          <div class="detection-formula" id="panel-sub">
            <span>loading CLIP model</span>
          </div>
        </div>
        <div>
          <div class="confidence-row">
            <span class="label">Confidence</span>
            <span class="v" id="confidence-pct">—</span>
          </div>
          <div class="confidence-bar"><span id="confidence-fill" style="width:0%"></span></div>
        </div>

        <div class="alt-section">
          <div class="alt-label">Other possibilities</div>
          <div id="alt-list">
            <div class="alt-row">
              <div class="alt-mark">··</div>
              <div class="alt-info">
                <div class="alt-name" style="color:var(--muted)">Waiting for first frame</div>
                <div class="alt-sub">Camera + model load</div>
              </div>
            </div>
          </div>
        </div>

        <div class="tip-card">
          <div class="head" id="pipeline-head">Pipeline</div>
          <div class="body" id="pipeline-body">CLIP (Xenova/clip-vit-base-patch32) matches the camera feed against ${buildVocabulary().length} topics. Capture triggers Phi-3 via Ollama to write the flashcard.</div>
          <div class="foot" id="pipeline-foot">Loading models…</div>
        </div>
      </aside>

      <!-- Multi-mode picker, hidden until YOLO returns boxes -->
      <div class="yolo-picker" id="yolo-picker" hidden>
        <div class="yolo-panel">
          <div class="yolo-head">
            <div>
              <div class="yolo-eyebrow">Multi-object capture</div>
              <div class="yolo-title">Pick an object</div>
            </div>
            <button class="btn" id="yolo-close">${ico('x')} Cancel</button>
          </div>
          <div class="yolo-meta" id="yolo-meta">—</div>
          <div class="yolo-grid" id="yolo-grid"></div>
        </div>
      </div>
    </div>`;

  // --- Kick off the async controller (camera + CLIP + loop) ---
  startScanController(root).catch(err => {
    console.error('[scan] fatal:', err);
    showScanError(root, err);
  });
}

async function startScanController(root) {
  const ML = window.LensML;
  if (!ML) {
    // If <script type="module"> hasn't loaded yet, wait for it
    await new Promise(resolve => window.addEventListener('lens-ml-ready', resolve, { once: true }));
  }
  const { Clip, Llm, Yolo, Camera } = window.LensML;

  const videoEl  = $('#scan-video', root);
  const pill     = $('#detection-pill', root);
  const detName  = $('#detection-name', root);
  const detPct   = $('#detection-pct', root);
  const panelName = $('#panel-name', root);
  const panelSub  = $('#panel-sub', root);
  const confPct  = $('#confidence-pct', root);
  const confFill = $('#confidence-fill', root);
  const altList  = $('#alt-list', root);
  const scanHint = $('#scan-hint', root);
  const scanFormula = $('#scan-formula', root);
  const mlText   = $('#ml-text', root);
  const mlDot    = $('#ml-dot', root);
  const llmText  = $('#llm-text', root);
  const llmDot   = $('#llm-dot', root);
  const yoloText = $('#yolo-text', root);
  const yoloDot  = $('#yolo-dot', root);
  const yoloStatus = $('#yolo-status', root);
  const pipeFoot = $('#pipeline-foot', root);

  const setMl = (text, color) => { mlText.textContent = text; if (color) mlDot.style.background = color; };
  const setLlm = (text, color) => { llmText.textContent = text; llmDot.style.background = color; llmDot.style.boxShadow = color === '#2ecc71' ? '0 0 0 3px rgba(46,204,113,.18)' : 'none'; };

  // 1. Start camera
  setMl('Opening camera…', '#E5A23A');
  const cam = new Camera();
  try {
    await cam.start(videoEl);
  } catch (err) {
    console.error('[camera]', err);
    setMl('No camera', '#E97352');
    panelName.textContent = 'Camera unavailable';
    panelSub.innerHTML = `<span>${cameraErrorMessage(err)}</span>`;
    pipeFoot.textContent = 'Start the page from https:// or http://localhost so the browser grants camera access.';
    return;
  }

  // 2. Load CLIP (first run downloads ~150 MB, cached afterwards by the browser)
  setMl('Loading CLIP…', '#E5A23A');
  pipeFoot.textContent = 'Downloading CLIP weights (first run only)…';
  try {
    const { device } = await Clip.init({
      onProgress: ({ message }) => { pipeFoot.textContent = message; },
    });
    setMl(`CLIP · ${device}`, '#2ecc71');
  } catch (err) {
    console.error('[clip init]', err);
    setMl('CLIP failed', '#E97352');
    panelName.textContent = 'Model load failed';
    panelSub.innerHTML = `<span>${(err.message || err).slice(0, 140)}</span>`;
    pipeFoot.textContent = 'Check network connection — CLIP weights load from the Hugging Face CDN on first run.';
    return;
  }

  // 3. Index vocabulary (fast — runs once and re-runs only if we ever mutate data.js)
  pipeFoot.textContent = 'Indexing recognition vocabulary…';
  const vocab = buildVocabulary();
  await Clip.indexVocabulary(vocab);
  RT.mlReady = true;

  // 4. Probe Ollama in parallel (non-blocking)
  checkOllama(llmText, llmDot, pipeFoot);

  // 5. Scoring loop
  let lastTop = null;
  let latencyMs = 0;
  let busy = false;

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const canvas = cam.captureFrame(224);
      if (!canvas) return;
      const t0 = performance.now();
      const { top, confidence, results, rawScore } = await Clip.scoreCanvas(canvas, { topK: 3 });
      latencyMs = performance.now() - t0;

      const topMeta = vocabMeta(top.id);
      if (!topMeta) return; // should never happen

      // Low-confidence gate. CLIP raw cosine for real-world matches tends to
      // sit in [0.18, 0.32]. Below 0.20 we treat the frame as "nothing in view".
      const trulyLow = rawScore < 0.20;
      if (trulyLow) {
        pill.hidden = true;
        panelName.textContent = 'No confident match';
        panelSub.innerHTML = `<span>Point at a distinct object</span><span>·</span><span style="font-family:var(--font-mono)">${latencyMs.toFixed(0)} ms</span>`;
        confFill.style.width = '0%';
        confPct.textContent = '—';
        scanHint.textContent = 'Nothing recognized — move closer or try another object';
        scanFormula.textContent = '—';
        altList.innerHTML = renderAlts(results, 0);
        lastTop = null;
        return;
      }

      // Display confidence = softmaxed over top-K (always near 1.0 for the
      // winner by construction) scaled by the raw cosine as a "quality" factor.
      const displayPct = Math.round(Math.min(0.99, confidence * Math.min(1, rawScore / 0.30)) * 100);

      pill.hidden = false;
      detName.textContent = topMeta.displayName;
      detPct.textContent = displayPct + '%';

      panelName.textContent = topMeta.displayName;
      panelSub.innerHTML = `
        <span class="strong">${topMeta.subject || ''}</span>
        <span>·</span>
        <span style="font-family:var(--font-mono)">cos ${rawScore.toFixed(2)}</span>
        <span>·</span>
        <span style="font-family:var(--font-mono)">${latencyMs.toFixed(0)} ms</span>`;
      confPct.textContent = displayPct + '%';
      confFill.style.width = displayPct + '%';

      scanHint.textContent = 'Recognized — press space or click to capture';
      scanFormula.textContent = topMeta.displayName;

      altList.innerHTML = renderAlts(results, displayPct);

      lastTop = { id: top.id, meta: topMeta, matchedPrompt: top.matchedPrompt, rawScore };
    } catch (err) {
      console.warn('[scan tick]', err);
    } finally {
      busy = false;
    }
  };

  const loop = setInterval(tick, 500);

  // --- Mode toggle handling ---
  const updateModeUi = () => {
    root.querySelectorAll('.mode-opt').forEach(b => {
      const on = b.dataset.mode === RT.scanMode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
    });
    yoloStatus.classList.toggle('is-hidden', RT.scanMode !== 'multi');
    if (RT.scanMode === 'multi') {
      pipeFoot.textContent = 'Multi mode · YOLO localizes objects at capture, CLIP re-identifies, Phi-3 writes.';
      scanHint.textContent = 'Point at a cluttered scene · capture runs YOLO and shows a picker';
    } else {
      pipeFoot.textContent = `${RT.ollamaOk ? (window.LensML.Llm.getConfig().model + ' will write a flashcard on capture.') : 'Single-object mode · CLIP picks the top match.'}`;
      scanHint.textContent = 'Recognized — press space or click to capture';
    }
  };

  root.querySelectorAll('.mode-opt').forEach(b => b.addEventListener('click', () => {
    setScanMode(b.dataset.mode);
    updateModeUi();
    if (RT.scanMode === 'multi') checkYolo();
  }));

  // YOLO health check — only bother if the user opts into multi mode.
  const setYolo = (text, color) => {
    yoloText.textContent = text;
    yoloDot.style.background = color;
    yoloDot.style.boxShadow = color === '#2ecc71' ? '0 0 0 3px rgba(46,204,113,.18)' : 'none';
  };
  let yoloHealthChecked = false;
  const checkYolo = async () => {
    if (yoloHealthChecked) return;
    yoloHealthChecked = true;
    setYolo('YOLO · checking…', '#E5A23A');
    const h = await Yolo.health();
    if (h.ok) {
      RT.yoloOk = true;
      setYolo(`YOLO · ${h.device}`, '#2ecc71');
    } else {
      RT.yoloOk = false;
      setYolo('YOLO offline', '#E97352');
    }
  };
  if (RT.scanMode === 'multi') {
    updateModeUi();
    checkYolo();
  }

  // --- Shared: turn a vocab id + meta into a flashcard navigation ---
  // hintCanvas (optional) is forwarded to Phi-3 only for context via the prompt.
  const handleTopic = async ({ id, meta, matchedPrompt }) => {
    if (D.flashcards[id]) {
      recordCapture({ id, meta, isGenerated: false });
      navigate(`#flashcard?id=${id}`);
      return;
    }
    if (RT.generatedCards[id]) {
      recordCapture({ id, meta, isGenerated: true });
      navigate(`#flashcard?id=${id}`);
      return;
    }
    if (!RT.ollamaOk) {
      scanHint.textContent = 'Ollama unreachable — start "ollama serve" then try again';
      return;
    }
    showGenOverlay(meta.displayName);
    try {
      const flashcard = await Llm.generateFlashcard({
        topic: meta.displayName,
        hintPrompt: matchedPrompt,
      });
      RT.generatedCards[id] = {
        id,
        crumbs: ['Decks', 'Generated'],
        subject: flashcard.subject || meta.subject,
        name: flashcard.name,
        formula: flashcard.formula,
        mass: flashcard.mass,
        grad: meta.grad || 'var(--grad-physics)',
        scanned: 'JUST NOW · LIVE SCAN',
        reviewWhen: 'Tomorrow',
        reviewAt: '9:00 AM',
        reviewProgress: { done: 0, total: 4 },
        oneline: flashcard.oneline,
        facts: flashcard.facts,
        generated: true,
      };
      recordCapture({ id, meta, isGenerated: true });
      hideGenOverlay();
      navigate(`#flashcard?id=${id}`);
    } catch (err) {
      console.error('[llm]', err);
      hideGenOverlay();
      scanHint.textContent = `Generation failed: ${(err.message || err).slice(0, 100)}`;
    }
  };

  // 6. Capture handler — branches on mode.
  const capture = async () => {
    const btn = $('#capture-btn', root);
    if (btn) { btn.style.transform = 'scale(.92)'; setTimeout(() => btn.style.transform = '', 120); }

    if (RT.scanMode === 'multi') {
      return captureMulti();
    }
    // ---- single mode (default) ----
    if (!lastTop) {
      scanHint.textContent = 'No confident match yet — hold steady';
      return;
    }
    handleTopic(lastTop);
  };

  // Multi-mode capture: YOLO server produces boxes + crops, CLIP re-IDs each crop,
  // then we render a picker. User click = existing authored/generated flow.
  const captureMulti = async () => {
    if (!RT.yoloOk) {
      scanHint.textContent = 'YOLO server not reachable at 127.0.0.1:8765 — start YOLOv8-Detection/serve.py';
      return;
    }
    const full = cam.captureFrame(720); // bigger frame helps YOLO catch small objects
    if (!full) { scanHint.textContent = 'Camera frame unavailable'; return; }

    scanHint.textContent = 'Detecting objects…';
    let det;
    try {
      det = await Yolo.detect(full, { conf: 0.3, maxDets: 6 });
    } catch (err) {
      console.error('[yolo]', err);
      scanHint.textContent = `YOLO error: ${(err.message || err).slice(0, 120)}`;
      return;
    }
    if (!det.detections.length) {
      scanHint.textContent = 'Nothing detected — try a different angle or lower confidence';
      return;
    }

    // Re-ID each crop against CLIP in parallel. Skips ones CLIP can't match above
    // a floor — those still display but with a "generic" label for fallback.
    scanHint.textContent = `Identifying ${det.detections.length} object${det.detections.length===1?'':'s'}…`;
    const items = await Promise.all(det.detections.map(async (d) => {
      try {
        const cropCanvas = await Yolo.cropToCanvas(d.crop, 224);
        const r = await Clip.scoreCanvas(cropCanvas, { topK: 2 });
        const meta = vocabMeta(r.top.id) || null;
        return {
          yoloClass: d.className,
          yoloConf: d.confidence,
          boxRel: d.boxRel,
          crop: d.crop,
          clip: {
            id: r.top.id,
            raw: r.rawScore,
            matchedPrompt: r.top.matchedPrompt,
            meta,
          },
        };
      } catch (err) {
        console.warn('[clip recrop]', err);
        return {
          yoloClass: d.className,
          yoloConf: d.confidence,
          boxRel: d.boxRel,
          crop: d.crop,
          clip: null,
        };
      }
    }));

    openYoloPicker({
      root,
      items,
      inferenceMs: det.inferenceMs,
      device: det.device,
      onPick: (item) => {
        closeYoloPicker(root);
        // If CLIP found a vocabulary entry with decent cosine, take it.
        if (item.clip && item.clip.meta && item.clip.raw >= 0.18) {
          handleTopic({
            id: item.clip.id,
            meta: item.clip.meta,
            matchedPrompt: item.clip.matchedPrompt,
          });
          return;
        }
        // Otherwise fall back to the YOLO class name — Phi-3 can still write a
        // flashcard on that topic. We synthesize a meta object so handleTopic
        // has what it needs.
        const id = `yolo-${item.yoloClass.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const displayName = prettifyClass(item.yoloClass);
        handleTopic({
          id,
          meta: { id, displayName, subject: 'OBJECT · YOLO', grad: 'var(--grad-physics)', kind: 'yolo' },
          matchedPrompt: `a photo of a ${displayName.toLowerCase()}`,
        });
      },
    });
    scanHint.textContent = `YOLO · ${det.device} · ${det.inferenceMs.toFixed(0)} ms · pick an object`;
  };

  $('#capture-btn', root).addEventListener('click', capture);
  $('#yolo-close', root)?.addEventListener('click', () => closeYoloPicker(root));

  // 7. Register a scan controller so we can tear down on navigate-away
  RT.scan = {
    stop: () => {
      clearInterval(loop);
      cam.stop();
    },
    capture,
  };

  // Space-to-capture (installs over attachGlobalKeys's handler for the scan view).
  // attachGlobalKeys() also looks up #capture-btn and clicks it, so this is belt+braces.
}

function renderAlts(results, topDisplayPct) {
  if (!results || results.length <= 1) {
    return `<div class="alt-row"><div class="alt-mark">··</div><div class="alt-info"><div class="alt-name" style="color:var(--muted)">No alternatives</div></div></div>`;
  }
  // Skip index 0 (the winner) and show the rest
  return results.slice(1).map((r, idx) => {
    const m = vocabMeta(r.id);
    if (!m) return '';
    const pct = Math.round(r.confidence * (topDisplayPct / 100) * 100);
    const mark = (m.displayName || '??').slice(0, 2);
    return `
      <div class="alt-row">
        <div class="alt-mark">${escapeHtml(mark)}</div>
        <div class="alt-info">
          <div class="alt-name">${escapeHtml(m.displayName)}</div>
          <div class="alt-sub">${escapeHtml(m.subject || '')}</div>
        </div>
        <div class="alt-pct">${pct}%</div>
      </div>`;
  }).join('');
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

// Turn YOLO's snake_case COCO label into a display string.
function prettifyClass(raw) {
  return (raw || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Object';
}

// Multi-mode picker overlay — build + wire.
function openYoloPicker({ root, items, inferenceMs, device, onPick }) {
  const overlay = $('#yolo-picker', root);
  const grid = $('#yolo-grid', root);
  const meta = $('#yolo-meta', root);
  meta.textContent = `${items.length} object${items.length===1?'':'s'} · YOLOv8 on ${device} · ${inferenceMs.toFixed(0)} ms · CLIP re-identified each crop`;
  grid.innerHTML = items.map((it, idx) => {
    const yoloPct = Math.round(it.yoloConf * 100);
    const clipLabel = it.clip?.meta?.displayName || prettifyClass(it.yoloClass);
    const clipSub = it.clip?.meta
      ? `${it.clip.meta.subject || ''} · cos ${it.clip.raw.toFixed(2)}`
      : `YOLO class · ${prettifyClass(it.yoloClass)}`;
    const isVocab = !!it.clip?.meta && it.clip.raw >= 0.18;
    return `
      <button class="yolo-item" data-idx="${idx}">
        <div class="yolo-thumb"><img src="${it.crop}" alt=""></div>
        <div class="yolo-item-body">
          <div class="yolo-item-title">${escapeHtml(clipLabel)}</div>
          <div class="yolo-item-sub">${escapeHtml(clipSub)}</div>
          <div class="yolo-item-meta">
            <span class="yolo-tag ${isVocab ? 'is-vocab' : ''}">${isVocab ? 'In library' : 'Generate'}</span>
            <span class="yolo-confs">YOLO ${yoloPct}%</span>
          </div>
        </div>
      </button>`;
  }).join('');

  grid.querySelectorAll('.yolo-item').forEach(btn => btn.addEventListener('click', () => {
    const i = parseInt(btn.dataset.idx, 10);
    onPick(items[i]);
  }));
  overlay.hidden = false;
}
function closeYoloPicker(root) {
  const overlay = root ? $('#yolo-picker', root) : document.getElementById('yolo-picker');
  if (overlay) overlay.hidden = true;
}

// ----- Flashcard tab panels (quiz history + sources) -----
function renderQuizHistoryPanel(card) {
  const sessions = RT.quizSessions.filter(s => (s.cardIds || []).includes(card.id));
  if (!sessions.length) {
    return `
      <div class="oneline">Quiz history</div>
      <p class="oneline-text">No sessions yet for this card. Click <strong>Quiz me</strong> above to run one — your score will show up here.</p>
    `;
  }
  const totQ = sessions.reduce((a, s) => a + s.total, 0);
  const totC = sessions.reduce((a, s) => a + s.correct, 0);
  const overallPct = totQ ? Math.round((totC / totQ) * 100) : 0;

  const rows = sessions.map(s => {
    const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    const when = relativeTime(s.at);
    return `
      <div class="history-row">
        <div class="history-when">${escapeHtml(when)}</div>
        <div class="history-bar"><span style="width:${pct}%"></span></div>
        <div class="history-score">${s.correct} / ${s.total}</div>
        <div class="history-pct">${pct}%</div>
      </div>`;
  }).join('');

  return `
    <div class="oneline">Quiz history</div>
    <div class="history-summary">
      <div class="history-hero">
        <span class="hl">${overallPct}%</span>
        <span class="history-hero-sub">across ${sessions.length} session${sessions.length===1?'':'s'}</span>
      </div>
      <div class="history-hero-meta">${totC} correct · ${totQ - totC} missed · ${totQ} question${totQ===1?'':'s'} total</div>
    </div>
    <div class="history-list">
      <div class="history-head">
        <div>When</div><div>Score</div><div></div><div class="t-right">%</div>
      </div>
      ${rows}
    </div>
    <div class="history-actions">
      <button class="btn btn-primary" data-action="quiz-me" data-card-id="${card.id}"><span class="dot"></span>Quiz again</button>
    </div>
  `;
}

function renderSourcesPanel(card) {
  const subject = (card.subject || '').split(' · ')[0].trim().toUpperCase();
  const sources = sourcesForSubject(subject, card);
  const linksHtml = sources.map(s => `
    <a class="source-row" href="${s.href}" target="_blank" rel="noopener noreferrer">
      <div class="source-mark" style="background:${s.swatch}">${s.tag}</div>
      <div class="source-info">
        <div class="source-title">${escapeHtml(s.title)}</div>
        <div class="source-sub">${escapeHtml(s.sub)}</div>
      </div>
      <div class="source-arrow">${ico('chev-right')}</div>
    </a>`).join('');

  const prov = card.generated
    ? 'Drafted on capture by a local Phi-3 model via Ollama — review for accuracy.'
    : 'Hand-authored reference card in the Lens corpus.';

  return `
    <div class="oneline">Sources</div>
    <p class="oneline-text">Matched by CLIP (<code>Xenova/clip-vit-base-patch32</code>), then composed from the references below. ${prov}</p>
    <div class="source-list">${linksHtml}</div>
  `;
}

// Subject-driven list of public reference sources. Each card's queries are
// URL-encoded against its display name so links land on a relevant page.
function sourcesForSubject(subject, card) {
  const q = encodeURIComponent(card.name);
  const wiki = {
    title: 'Wikipedia',
    sub: `Search: ${card.name}`,
    tag: 'WP',
    swatch: 'var(--grad-arch)',
    href: `https://en.wikipedia.org/wiki/Special:Search?search=${q}`,
  };
  const wikidata = {
    title: 'Wikidata',
    sub: 'Structured entity data',
    tag: 'WD',
    swatch: 'var(--grad-physics)',
    href: `https://www.wikidata.org/w/index.php?search=${q}`,
  };
  const pubchem = {
    title: 'PubChem',
    sub: 'NIH chemistry database',
    tag: 'PC',
    swatch: 'var(--grad-blue)',
    href: `https://pubchem.ncbi.nlm.nih.gov/#query=${q}`,
  };
  const chemspider = {
    title: 'ChemSpider',
    sub: 'Royal Society of Chemistry',
    tag: 'CS',
    swatch: 'var(--grad-violet)',
    href: `https://www.chemspider.com/Search.aspx?q=${q}`,
  };
  const ncbi = {
    title: 'NCBI / MeSH',
    sub: 'Biomedical reference',
    tag: 'NC',
    swatch: 'var(--grad-orange)',
    href: `https://www.ncbi.nlm.nih.gov/pubmed/?term=${q}`,
  };
  const itis = {
    title: 'ITIS',
    sub: 'Taxonomic reference',
    tag: 'IT',
    swatch: 'var(--grad-green)',
    href: `https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=Scientific_Name&search_value=${q}`,
  };
  const mindat = {
    title: 'Mindat',
    sub: 'Mineralogy database',
    tag: 'MD',
    swatch: 'var(--grad-violet)',
    href: `https://www.mindat.org/search.php?search=${q}`,
  };
  const nasa = {
    title: 'NASA Science',
    sub: 'Planetary reference',
    tag: 'NA',
    swatch: 'var(--grad-astro)',
    href: `https://science.nasa.gov/?search=${q}`,
  };
  const archnet = {
    title: 'Archnet',
    sub: 'Architecture archive (MIT)',
    tag: 'AN',
    swatch: 'var(--grad-arch)',
    href: `https://www.archnet.org/search?q=${q}`,
  };
  const wikiart = {
    title: 'WikiArt',
    sub: 'Art history index',
    tag: 'WA',
    swatch: 'var(--grad-art)',
    href: `https://www.wikiart.org/en/search/${q}`,
  };

  switch (subject) {
    case 'CHEMISTRY':   return [pubchem, chemspider, wiki, wikidata];
    case 'BIOLOGY':
    case 'ANATOMY':     return [ncbi, wiki, wikidata];
    case 'BOTANY':
    case 'ZOOLOGY':     return [itis, ncbi, wiki];
    case 'GEOLOGY':     return [mindat, wiki, wikidata];
    case 'ASTRONOMY':   return [nasa, wiki, wikidata];
    case 'ARCHITECTURE': return [archnet, wiki, wikidata];
    case 'ART HISTORY': return [wikiart, wiki, wikidata];
    case 'PHYSICS':     return [wiki, wikidata];
    default:            return [wiki, wikidata];
  }
}

function cameraErrorMessage(err) {
  switch (err.code) {
    case 'denied':      return 'Camera permission denied — grant access and reload.';
    case 'no-device':   return 'No camera detected on this device.';
    case 'unsupported': return 'Camera requires HTTPS or http://localhost.';
    default:            return err.message || 'Camera unavailable.';
  }
}

async function checkOllama(llmText, llmDot, pipeFoot) {
  const { Llm } = window.LensML;
  try {
    const h = await Llm.health();
    if (h.ok) {
      RT.ollamaOk = true;
      llmText.textContent = h.hasConfiguredModel ? 'Phi-3 · ready' : `Phi-3 · pull ${Llm.getConfig().model}`;
      llmDot.style.background = h.hasConfiguredModel ? '#2ecc71' : '#E5A23A';
      llmDot.style.boxShadow = h.hasConfiguredModel ? '0 0 0 3px rgba(46,204,113,.18)' : 'none';
      if (h.hasConfiguredModel) {
        if (pipeFoot) pipeFoot.textContent = `${Llm.getConfig().model} will write a flashcard on capture.`;
      } else {
        if (pipeFoot) pipeFoot.textContent = `Ollama is running, but \`${Llm.getConfig().model}\` isn't installed. Run: ollama pull ${Llm.getConfig().model}`;
      }
    } else {
      RT.ollamaOk = false;
      llmText.textContent = 'LLM offline';
      llmDot.style.background = '#8B8B86';
      llmDot.style.boxShadow = 'none';
      if (pipeFoot) pipeFoot.textContent = 'Ollama not reachable at localhost:11434. Known flashcards still work.';
    }
  } catch (err) {
    RT.ollamaOk = false;
    llmText.textContent = 'LLM offline';
  }
}

function showGenOverlay(topic) {
  const ov = document.getElementById('gen-overlay');
  document.getElementById('gen-topic').textContent = topic;
  document.getElementById('gen-sub').textContent = 'Phi-3 is composing the explanation and key facts.';
  ov.hidden = false;
}
function hideGenOverlay() {
  const ov = document.getElementById('gen-overlay');
  if (ov) ov.hidden = true;
}

function showScanError(root, err) {
  const hint = $('#scan-hint', root);
  if (hint) hint.textContent = `Error: ${err.message || err}`;
}

// ---------- Quiz (new) ----------
// Generates a self-graded quiz from a card's facts. Each fact becomes a question:
// the LABEL is the prompt, the BODY is the "answer". The user reads the question,
// hits "Show answer", then self-grades via "I knew it" / "Try again".
function renderQuiz(root, params) {
  const mode = params.get('mode');
  const id = params.get('id');

  // Decide the card set. Single-card mode = just that card. Review mode = all
  // authored cards that map to a due-today entry (fall back to `copper-sulfate`).
  let cards = [];
  if (mode === 'review') {
    const ids = D.dueToday.map(d => d.id).filter(i => D.flashcards[i] || RT.generatedCards[i]);
    cards = ids.map(i => D.flashcards[i] || RT.generatedCards[i]);
    if (!cards.length) cards = [D.flashcards['copper-sulfate']];
  } else {
    const card = D.flashcards[id] || RT.generatedCards[id] || D.flashcards['copper-sulfate'];
    cards = [card];
  }

  // Flatten every fact across all cards into one quiz queue.
  const queue = [];
  for (const c of cards) {
    for (const f of (c.facts || [])) {
      queue.push({ cardId: c.id, cardName: c.name, grad: c.grad, label: f.label, body: f.body });
    }
  }
  if (!queue.length) {
    root.innerHTML = `<div class="app-shell">${renderSidebar('')}<div class="main">${renderTopbar({ withSearch: false })}<div class="quiz-page"><div class="quiz-empty">No questions available.</div></div></div></div>`;
    return;
  }

  const state = { i: 0, correct: 0, revealed: false };

  const mount = () => {
    const q = queue[state.i];
    const progressPct = Math.round((state.i / queue.length) * 100);

    root.innerHTML = `
      <div class="app-shell">
        ${renderSidebar('')}
        <div class="main">
          ${renderTopbar({ withSearch: false, rightSlot: `
            <div class="crumbs" style="margin-right:auto">
              <span>Quiz</span><span class="sep">›</span>
              <span class="now">${escapeHtml(q.cardName)}</span>
            </div>
            <button class="btn" data-route="#flashcard?id=${q.cardId}">${ico('x')} Exit quiz</button>
          ` })}
          <div class="quiz-page">
            <div class="quiz-shell">
              <div class="quiz-meta">
                <div class="quiz-count">Question ${state.i + 1} of ${queue.length}</div>
                <div class="quiz-score">Score ${state.correct} / ${state.i}</div>
              </div>
              <div class="quiz-progress"><span style="width:${progressPct}%"></span></div>

              <div class="quiz-card-wrap">
                <button class="quiz-card-flip" id="quiz-flip" aria-label="Reveal answer">
                  <div class="quiz-card-face front" style="background:${q.grad}">
                    <div class="quiz-eyebrow">${escapeHtml(q.cardName)}</div>
                    <div class="quiz-question">${escapeHtml(q.label)}</div>
                    <div class="quiz-face-foot">Tap card or press <kbd>space</kbd> to reveal</div>
                  </div>
                  <div class="quiz-card-face back" style="background:${q.grad}">
                    <div class="quiz-eyebrow">Answer</div>
                    <div class="quiz-answer-text">${escapeHtml(q.body)}</div>
                    <div class="quiz-face-foot">Grade yourself below · <kbd>1</kbd> wrong · <kbd>2</kbd> right</div>
                  </div>
                </button>
              </div>

              <div class="quiz-actions" id="quiz-actions">
                <button class="btn btn-primary" data-quiz-reveal><span class="dot"></span>Show answer</button>
                <span class="quiz-hint">Click the card or press <kbd>space</kbd> to flip</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    const flip = root.querySelector('#quiz-flip');
    const actions = root.querySelector('#quiz-actions');

    const reveal = () => {
      if (state.revealed) return;
      state.revealed = true;
      flip.classList.add('is-flipped');
      actions.innerHTML = `
        <button class="btn" data-quiz-grade="wrong">Try again</button>
        <button class="btn btn-accent" data-quiz-grade="right"><span class="dot"></span>I knew it</button>
        <span class="quiz-hint">Self-grade · <kbd>1</kbd> wrong · <kbd>2</kbd> right</span>
      `;
      actions.querySelectorAll('[data-quiz-grade]').forEach(b =>
        b.addEventListener('click', (e) => { e.stopPropagation(); grade(b.dataset.quizGrade === 'right'); })
      );
    };

    flip.addEventListener('click', reveal);
    actions.querySelector('[data-quiz-reveal]')?.addEventListener('click', (e) => { e.stopPropagation(); reveal(); });
  };

  const grade = (correct) => {
    if (correct) state.correct++;
    state.i++;
    state.revealed = false;
    if (state.i >= queue.length) {
      finish();
    } else {
      mount();
    }
  };

  const finish = () => {
    RT.quizSessions.unshift({
      cardIds: [...new Set(queue.map(q => q.cardId))],
      correct: state.correct,
      total: queue.length,
      at: Date.now(),
    });
    const pct = Math.round((state.correct / queue.length) * 100);
    root.innerHTML = `
      <div class="app-shell">
        ${renderSidebar('')}
        <div class="main">
          ${renderTopbar({ withSearch: false, rightSlot: `
            <button class="btn" data-route="#dashboard">Done</button>
          ` })}
          <div class="quiz-page">
            <div class="quiz-result">
              <div class="eyebrow">Session complete</div>
              <h1 class="quiz-result-title"><span class="hl">${state.correct} / ${queue.length}</span></h1>
              <p class="quiz-result-sub">${pct}% retention · ${queue.length} question${queue.length===1?'':'s'} across ${new Set(queue.map(q=>q.cardId)).size} card${new Set(queue.map(q=>q.cardId)).size===1?'':'s'}.</p>
              <div class="quiz-actions">
                <button class="btn" data-route="#dashboard">Back to dashboard</button>
                <button class="btn btn-primary" data-action="start-review"><span class="dot"></span>Quiz again</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  };

  // Keyboard: space reveals (flip), 1 = wrong, 2 = right, esc exits.
  const onKey = (e) => {
    if (window.location.hash.split('?')[0] !== '#quiz') { document.removeEventListener('keydown', onKey, true); return; }
    if ($('#search-overlay')?.hidden === false) return;
    if (e.code === 'Space' && !state.revealed) {
      e.preventDefault();
      const flipEl = root.querySelector('#quiz-flip');
      flipEl && flipEl.click();
    } else if (state.revealed && (e.key === '1' || e.key === '2')) {
      e.preventDefault();
      grade(e.key === '2');
    }
  };
  document.addEventListener('keydown', onKey, true);

  mount();
}

// ---------- Flashcard detail (W3) ----------
function renderFlashcard(root, params) {
  const id = params.get('id') || 'copper-sulfate';
  const card = D.flashcards[id] || RT.generatedCards[id] || D.flashcards['copper-sulfate'];

  const right = `
    <button class="btn">${ico('share')} Share</button>
    <button class="btn btn-primary" data-action="quiz-me" data-card-id="${id}"><span class="dot"></span>Quiz me</button>
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

  // Tab switching — rebuilt per click so live data (quiz history) stays fresh.
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
      $('#panel', root).innerHTML = renderQuizHistoryPanel(card);
    } else {
      $('#panel', root).innerHTML = renderSourcesPanel(card);
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
  const startReview = e.target.closest('[data-action="start-review"]');
  if (startReview) { navigate('#quiz?mode=review'); return; }
  const quizMe = e.target.closest('[data-action="quiz-me"]');
  if (quizMe) { navigate(`#quiz?id=${quizMe.dataset.cardId}`); return; }
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
