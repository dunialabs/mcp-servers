import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type Card = { id: string; title: string; category: string; summary: string; score: number; status: string };
type TimelineItem = { id: string; title: string; start: string; end: string; lane: string; status: string };
type Payload = {
  view?: 'cards' | 'timeline';
  title?: string;
  layout?: string;
  revision?: number;
  statusCounts?: Record<string, number>;
  cards?: Card[];
  startDate?: string;
  days?: number;
  theme?: string;
  items?: TimelineItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'playground-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentTool = 'playgroundListCards';
let isRefreshing = false;
let revision = 0;
let lastRefreshAt = '';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function notifySizeChanged() {
  requestAnimationFrame(() => {
    const width = Math.ceil(document.documentElement.scrollWidth);
    const height = Math.ceil(document.documentElement.scrollHeight);
    void app.sendSizeChanged({ width, height });
  });
}

function applyHost() {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function baseShell(eyebrow: string, heading: string, meta: string, body: string): string {
  return `
    <style>
      html, body { height:auto; min-height:0; }
      body { margin:0; padding:16px; font-family: Georgia, serif; background: linear-gradient(180deg, #fffaf3, #eef5ff); color:#1f2937; }
      #app { display:block; width:100%; }
      .shell { display:grid; gap:12px; align-content:start; }
      .hero, .card, .row { background: rgba(255,255,255,0.94); border:1px solid rgba(31,41,55,0.12); border-radius:20px; box-shadow:0 10px 30px rgba(15,23,42,0.08); }
      .hero { padding:18px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
      .eyebrow { margin:0 0 8px; text-transform:uppercase; letter-spacing:0.18em; font-size:12px; color:#9a3412; }
      h1, h2, p { margin:0; }
      h1 { font-size:32px; line-height:1.05; }
      h2 { font-size:22px; line-height:1.15; margin:0 0 8px; }
      .meta { color:#6b7280; margin-top:8px; line-height:1.4; }
      .grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); align-items:start; }
      .card, .row { padding:16px; }
      .pill { display:inline-block; padding:4px 10px; border-radius:999px; background:#e5eefc; color:#1d4ed8; font-size:12px; margin-bottom:10px; }
      .summary { color:#4b5563; line-height:1.45; min-height:44px; }
      .score { font-size:26px; margin:10px 0 6px; }
      .status { color:#6b7280; font-size:14px; }
      .summary-panel { background: rgba(255,255,255,0.72); border:1px dashed rgba(31,41,55,0.16); border-radius:20px; padding:16px; display:grid; gap:12px; }
      .stats { display:grid; gap:10px; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); }
      .stat { background: rgba(255,255,255,0.92); border-radius:16px; padding:12px 14px; border:1px solid rgba(31,41,55,0.08); }
      .stat-label { font-size:12px; text-transform:uppercase; letter-spacing:0.14em; color:#6b7280; margin-bottom:8px; }
      .stat-value { font-size:28px; line-height:1; }
      .summary-text { color:#4b5563; line-height:1.55; }
      .refresh-note { color:#6b7280; font-size:13px; }
      .list { display:grid; gap:12px; }
      .row { gap:6px; }
      .row strong { font-size:18px; }
      .row span { color:#4b5563; line-height:1.4; }
      button { border:0; border-radius:999px; background:#111827; color:white; padding:10px 16px; font:inherit; cursor:pointer; min-width:102px; transition: opacity 0.2s ease; }
      button:disabled { cursor:default; opacity:0.65; }
      @media (max-width: 720px) { body { padding:14px; } h1 { font-size:28px; } }
    </style>
    <div class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">${escapeHtml(eyebrow)}</p>
          <h1>${escapeHtml(heading)}</h1>
          <p class="meta">${escapeHtml(meta)}</p>
        </div>
        <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
      </section>
      ${body}
    </div>
  `;
}

function renderCards(payload: Payload) {
  currentTool = 'playgroundListCards';
  const cards = payload.cards ?? [];
  const statusCounts = payload.statusCounts ?? {};
  revision = payload.revision ?? revision;
  root.innerHTML = baseShell(
    'MCP Apps Test',
    payload.title ?? 'Mock Card Board',
    `${cards.length} cards · layout ${payload.layout ?? 'grid'} · revision ${revision + 1}`,
    `<section class="grid">${cards.map((card) => `<article class="card"><span class="pill">${escapeHtml(card.category)}</span><h2>${escapeHtml(card.title)}</h2><p class="summary">${escapeHtml(card.summary)}</p><div class="score">${card.score}</div><p class="status">Status: ${escapeHtml(card.status)}</p></article>`).join('')}</section>
    <section class="summary-panel">
      <div class="stats">
        <div class="stat"><div class="stat-label">Total</div><div class="stat-value">${cards.length}</div></div>
        <div class="stat"><div class="stat-label">Active</div><div class="stat-value">${statusCounts.active ?? 0}</div></div>
        <div class="stat"><div class="stat-label">New</div><div class="stat-value">${statusCounts.new ?? 0}</div></div>
        <div class="stat"><div class="stat-label">Paused</div><div class="stat-value">${statusCounts.paused ?? 0}</div></div>
      </div>
      <p class="summary-text">This board is intentionally stateful for MCP Apps testing. Refresh regenerates the mock dataset so scores, statuses, and summaries visibly change between revisions instead of replaying identical content.</p>
      <p class="refresh-note">${lastRefreshAt ? `Last refresh at ${escapeHtml(lastRefreshAt)}.` : 'Use Refresh to request a new revision and verify interactive updates.'}</p>
    </section>`
  );
  notifySizeChanged();
}

function renderTimeline(payload: Payload) {
  currentTool = 'playgroundTimeline';
  const items = payload.items ?? [];
  revision = payload.revision ?? revision;
  root.innerHTML = baseShell(
    'MCP Apps Test',
    'Timeline View',
    `${items.length} blocks from ${payload.startDate ?? ''} across ${payload.days ?? 0} day(s) · revision ${revision + 1}`,
    `<section class="list">${items.map((item) => `<article class="row"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(formatDate(item.start))} - ${escapeHtml(formatDate(item.end))}</span><span>Lane: ${escapeHtml(item.lane)} · Status: ${escapeHtml(item.status)}</span></article>`).join('')}</section>`
  );
  notifySizeChanged();
}

function bindRefresh() {
  root.querySelector<HTMLButtonElement>('#refresh')?.addEventListener('click', async () => {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;

    const button = root.querySelector<HTMLButtonElement>('#refresh');
    if (button) {
      button.disabled = true;
      button.textContent = 'Refreshing...';
    }

    try {
      const result = await app.callServerTool({
        name: currentTool,
        arguments: {
          ...currentArgs,
          revision: revision + 1,
        },
      });
      lastRefreshAt = new Date().toLocaleTimeString();

      const payload = (result?.structuredContent ?? {}) as Payload;
      if (payload.view === 'timeline') {
        renderTimeline(payload);
      } else {
        renderCards(payload);
      }
      bindRefresh();
    } finally {
      isRefreshing = false;
      const nextButton = root.querySelector<HTMLButtonElement>('#refresh');
      if (nextButton) {
        nextButton.disabled = false;
        nextButton.textContent = 'Refresh';
      }
      notifySizeChanged();
    }
  });
}

app.ontoolinput = ({ arguments: args }) => {
  currentArgs = args ?? {};
  if (typeof args?.revision === 'number') {
    revision = args.revision;
  }
  currentTool = app.getHostContext()?.toolInfo?.tool?.name ?? currentTool;
};

app.ontoolresult = (result) => {
  const payload = (result.structuredContent ?? {}) as Payload;
  if (payload.view === 'timeline') {
    renderTimeline(payload);
  } else {
    renderCards(payload);
  }
  bindRefresh();
};

app.onhostcontextchanged = () => applyHost();
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
