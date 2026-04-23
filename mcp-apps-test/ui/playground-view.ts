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
let isDarkTheme = false;
let currentPayload: Payload = {};

function detectDarkTheme(): boolean {
  const context = app.getHostContext();
  const theme = context?.theme as { mode?: string; appearance?: string; colorScheme?: string } | undefined;
  const mode = (theme?.mode ?? theme?.appearance ?? theme?.colorScheme ?? '').toLowerCase();
  if (mode.includes('dark')) return true;
  if (mode.includes('light')) return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyHost() {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
  isDarkTheme = detectDarkTheme();
}

function notifySizeChanged() {
  requestAnimationFrame(() => {
    void app.sendSizeChanged({
      width: Math.ceil(document.documentElement.scrollWidth),
      height: Math.ceil(document.documentElement.scrollHeight),
    });
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function getTheme() {
  return isDarkTheme
    ? {
        title: '#f5f5f5',
        text: '#d4d4d8',
        muted: '#a1a1aa',
        shellBg:
          'radial-gradient(circle at top left, rgba(251, 146, 60, 0.14), transparent 36%), linear-gradient(180deg, #0f172a 0%, #1c1209 100%)',
        panelBg: 'rgba(24, 24, 27, 0.94)',
        panelBorder: 'rgba(251, 146, 60, 0.12)',
        shadow: '0 10px 24px rgba(2, 6, 23, 0.38)',
        accent: '#fb923c',
        chipBg: '#291a08',
        chipText: '#fb923c',
        headText: '#94a3b8',
        rowBorder: 'rgba(251, 146, 60, 0.1)',
        link: '#e0f2fe',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
        pillBg: '#27272a',
        pillText: '#a1a1aa',
        scoreText: '#e4e4e7',
      }
    : {
        title: '#1c0a00',
        text: '#5b6471',
        muted: '#667085',
        shellBg:
          'radial-gradient(circle at top left, rgba(255, 237, 213, 0.9), transparent 35%), linear-gradient(180deg, #fffaf5 0%, #fff8f0 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(28, 10, 0, 0.1)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        accent: '#c2410c',
        chipBg: '#fff7ed',
        chipText: '#c2410c',
        headText: '#667085',
        rowBorder: 'rgba(28, 10, 0, 0.06)',
        link: '#5b6f95',
        buttonBg: '#1c0a00',
        buttonText: '#ffffff',
        pillBg: '#f3f4f6',
        pillText: '#374151',
        scoreText: '#111827',
      };
}

function buildShell(
  eyebrow: string,
  heading: string,
  subtitle: string,
  chips: string,
  body: string,
  note?: string,
): string {
  const t = getTheme();
  return `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body { font-family: Georgia, serif; color: ${t.title}; background: transparent; padding: 0; }
      .shell { display: grid; gap: 12px; margin: 10px; padding: 10px; border-radius: 22px; background: ${t.shellBg}; }
      .hero, .panel { background: ${t.panelBg}; border: 1px solid ${t.panelBorder}; border-radius: 18px; box-shadow: ${t.shadow}; }
      .hero { padding: 12px; display: grid; gap: 8px; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: ${t.accent}; }
      h1, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; color: ${t.accent}; }
      .toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: nowrap; }
      .toolbar-main { min-width: 0; display: grid; gap: 6px; }
      .toolbar-actions { display: flex; align-items: flex-end; flex: 0 0 auto; margin-left: auto; }
      .subhead { color: ${t.text}; font-size: 13px; line-height: 1.4; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip { display: inline-flex; align-items: center; border-radius: 999px; background: ${t.chipBg}; color: ${t.chipText}; padding: 4px 8px; font-size: 11px; }
      button { border: 0; border-radius: 999px; padding: 4px 10px; font: inherit; background: ${t.buttonBg}; color: ${t.buttonText}; cursor: pointer; min-width: 66px; font-size: 11px; }
      button:disabled { opacity: 0.65; cursor: default; }
      @media (max-width: 640px) { .toolbar { flex-wrap: wrap; } .toolbar-actions { width: 100%; justify-content: flex-end; margin-left: 0; } }
      .panel { overflow: hidden; }
      .table-head, .table-row { display: grid; gap: 10px; align-items: start; }
      .cards-head, .cards-row { grid-template-columns: minmax(160px, 2fr) minmax(120px, 1.6fr) minmax(60px, 0.5fr) minmax(70px, 0.6fr); }
      .timeline-head, .timeline-row { grid-template-columns: minmax(160px, 2fr) minmax(180px, 1.8fr) minmax(80px, 0.8fr) minmax(70px, 0.6fr); }
      .table-head { padding: 9px 12px; border-bottom: 1px solid ${t.rowBorder}; color: ${t.headText}; font-size: 12px; }
      .table-body { max-height: 560px; overflow: auto; }
      .table-row { padding: 8px 12px; border-bottom: 1px solid ${t.rowBorder}; font-size: 13px; }
      .table-row:last-child { border-bottom: 0; }
      .row-title { font-size: 14px; font-weight: 700; line-height: 1.3; color: ${t.title}; }
      .pill { display: inline-block; margin-top: 3px; padding: 2px 7px; border-radius: 999px; background: ${t.pillBg}; color: ${t.pillText}; font-size: 11px; }
      .score-val { font-size: 15px; font-weight: 700; color: ${t.scoreText}; }
      .muted { color: ${t.text}; font-size: 12px; line-height: 1.4; }
      .empty { padding: 18px 14px; color: ${t.text}; font-size: 14px; }
      .note { color: ${t.muted}; font-size: 11px; line-height: 1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(heading)}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(subtitle)}</p>
            <div class="chips">${chips}</div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      ${body}
      ${note ? `<p class="note">${escapeHtml(note)}</p>` : ''}
    </div>
  `;
}

function renderCards(payload: Payload) {
  currentPayload = payload;
  currentTool = 'playgroundListCards';
  const cards = payload.cards ?? [];
  const statusCounts = payload.statusCounts ?? {};
  revision = payload.revision ?? revision;

  const chips = [
    `<span class="chip">Cards: ${cards.length}</span>`,
    `<span class="chip">Layout: ${escapeHtml(payload.layout ?? 'grid')}</span>`,
    `<span class="chip">Revision: ${revision + 1}</span>`,
    ...(statusCounts.active ? [`<span class="chip">Active: ${statusCounts.active}</span>`] : []),
  ].join('');

  const rows =
    cards.length === 0
      ? '<div class="empty">No cards returned for this request.</div>'
      : cards
          .map(
            (card) => `
          <div class="table-row cards-row">
            <div>
              <div class="row-title">${escapeHtml(card.title)}</div>
              <span class="pill">${escapeHtml(card.category)}</span>
            </div>
            <div class="muted">${escapeHtml(card.summary)}</div>
            <div class="score-val">${card.score}</div>
            <div class="muted">${escapeHtml(card.status)}</div>
          </div>
        `,
          )
          .join('');

  const body = `
    <section class="panel">
      <div class="table-head cards-head">
        <div>Card</div>
        <div>Summary</div>
        <div>Score</div>
        <div>Status</div>
      </div>
      <div class="table-body">${rows}</div>
    </section>
  `;

  const note = lastRefreshAt
    ? `Last refreshed at ${lastRefreshAt}. Refresh regenerates the mock dataset so scores, statuses, and summaries visibly change between revisions.`
    : 'Use Refresh to request a new revision and verify interactive updates.';

  root.innerHTML = buildShell(
    'MCP Apps Test',
    payload.title ?? 'Mock Card Board',
    'Mock card data for MCP Apps rendering and refresh tests.',
    chips,
    body,
    note,
  );
  bindRefresh();
  notifySizeChanged();
}

function renderTimeline(payload: Payload) {
  currentPayload = payload;
  currentTool = 'playgroundTimeline';
  const items = payload.items ?? [];
  revision = payload.revision ?? revision;

  const chips = [
    `<span class="chip">Blocks: ${items.length}</span>`,
    `<span class="chip">Start: ${escapeHtml(payload.startDate ?? '')}</span>`,
    `<span class="chip">Days: ${payload.days ?? 0}</span>`,
    `<span class="chip">Revision: ${revision + 1}</span>`,
  ].join('');

  const rows =
    items.length === 0
      ? '<div class="empty">No timeline items returned for this request.</div>'
      : items
          .map(
            (item) => `
          <div class="table-row timeline-row">
            <div class="row-title">${escapeHtml(item.title)}</div>
            <div class="muted">${escapeHtml(formatDate(item.start))} – ${escapeHtml(formatDate(item.end))}</div>
            <div class="muted">${escapeHtml(item.lane)}</div>
            <div class="muted">${escapeHtml(item.status)}</div>
          </div>
        `,
          )
          .join('');

  const body = `
    <section class="panel">
      <div class="table-head timeline-head">
        <div>Event</div>
        <div>Time</div>
        <div>Lane</div>
        <div>Status</div>
      </div>
      <div class="table-body">${rows}</div>
    </section>
  `;

  root.innerHTML = buildShell(
    'MCP Apps Test',
    'Timeline View',
    'Mock timeline blocks for MCP Apps rendering and refresh tests.',
    chips,
    body,
  );
  bindRefresh();
  notifySizeChanged();
}

function bindRefresh() {
  root.querySelector<HTMLButtonElement>('#refresh')?.addEventListener('click', async () => {
    if (isRefreshing) return;
    isRefreshing = true;

    const button = root.querySelector<HTMLButtonElement>('#refresh');
    if (button) {
      button.disabled = true;
      button.textContent = 'Refreshing...';
    }

    try {
      const result = await app.callServerTool({
        name: currentTool,
        arguments: { ...currentArgs, revision: revision + 1 },
      });
      lastRefreshAt = new Date().toLocaleTimeString();
      const payload = (result?.structuredContent ?? {}) as Payload;
      if (payload.view === 'timeline') {
        renderTimeline(payload);
      } else {
        renderCards(payload);
      }
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
  if (typeof args?.revision === 'number') revision = args.revision;
  currentTool = app.getHostContext()?.toolInfo?.tool?.name ?? currentTool;
};

app.ontoolresult = (result) => {
  const payload = (result.structuredContent ?? {}) as Payload;
  if (payload.view === 'timeline') {
    renderTimeline(payload);
  } else {
    renderCards(payload);
  }
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.view === 'timeline') {
    renderTimeline(currentPayload);
  } else if (currentPayload.cards) {
    renderCards(currentPayload);
  }
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
