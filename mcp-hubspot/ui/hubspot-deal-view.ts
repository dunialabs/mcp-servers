import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

type DealProperties = Record<string, string | number | boolean | null | undefined>;

type DealPayload = {
  kind?: 'hubspot-deal-detail';
  deal?: {
    id?: string | number | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    archived?: boolean | null;
    properties?: DealProperties | null;
  } | null;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'hubspot-deal-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentPayload: DealPayload = {};
let isRefreshing = false;
let isDarkTheme = false;

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

function formatDate(value?: string | null): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function propertyRows(properties: DealProperties): Array<[string, string]> {
  return Object.entries(properties)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim().length > 0)
    .slice(0, 16)
    .map(([key, value]) => [key, String(value)]);
}

function render(payload: DealPayload) {
  currentPayload = payload;
  const deal = payload.deal ?? {};
  const properties = deal.properties ?? {};
  const title = String(properties.dealname ?? deal.id ?? 'Untitled deal');
  const amount = formatMoney(properties.amount);
  const pipeline = String(properties.pipeline ?? 'Unknown pipeline');
  const stage = String(properties.dealstage ?? 'Unknown stage');
  const closeDate = formatDate(typeof properties.closedate === 'string' ? properties.closedate : null);
  const owner = String(properties.hubspot_owner_id ?? 'Unassigned');
  const theme = isDarkTheme
    ? {
        title: '#f5f5f5',
        text: '#d4d4d8',
        muted: '#a1a1aa',
        shellBg:
          'radial-gradient(circle at top left, rgba(234, 88, 12, 0.14), transparent 36%), linear-gradient(180deg, #0f172a 0%, #1c1007 100%)',
        panelBg: 'rgba(24,24,27,0.94)',
        panelBorder: 'rgba(253, 186, 116, 0.12)',
        shadow: '0 8px 20px rgba(0,0,0,0.28)',
        accent: '#fdba74',
        chipBg: '#431407',
        chipText: '#fdba74',
        summaryBg: 'rgba(39,27,7,0.96)',
        summaryBorder: 'rgba(253, 186, 116, 0.12)',
        headText: '#a1a1aa',
        rowBorder: 'rgba(253, 186, 116, 0.1)',
        link: '#fed7aa',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
      }
    : {
        title: '#1c0a00',
        text: '#5b6471',
        muted: '#667085',
        shellBg:
          'radial-gradient(circle at top left, rgba(255, 237, 213, 0.85), transparent 35%), linear-gradient(180deg, #fff8f5 0%, #fff4ed 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(234, 88, 12, 0.1)',
        shadow: '0 8px 20px rgba(15,23,42,0.05)',
        accent: '#ea580c',
        chipBg: '#fff7ed',
        chipText: '#ea580c',
        summaryBg: 'rgba(255,252,249,0.92)',
        summaryBorder: 'rgba(234, 88, 12, 0.08)',
        headText: '#667085',
        rowBorder: 'rgba(234, 88, 12, 0.07)',
        link: '#9a3412',
        buttonBg: '#1c0a00',
        buttonText: '#ffffff',
      };

  root.innerHTML = `
    <style>
      html, body { margin:0; padding:0; min-height:0; }
      body { font-family: Georgia, serif; color:${theme.title}; background:transparent; padding:0; }
      .shell { display:grid; gap:12px; margin:10px; padding:10px; border-radius:22px; overflow:hidden; background:${theme.shellBg}; }
      .hero, .panel { background:${theme.panelBg}; border:1px solid ${theme.panelBorder}; border-radius:18px; box-shadow:${theme.shadow}; }
      .hero { padding:12px; display:grid; gap:8px; }
      .eyebrow { margin:0; text-transform:uppercase; letter-spacing:0.16em; font-size:11px; color:${theme.accent}; }
      h1, p { margin:0; }
      h1 { font-size:22px; line-height:1.08; color:${theme.accent}; }
      .toolbar { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:nowrap; }
      .toolbar-main { min-width:0; display:grid; gap:6px; }
      .toolbar-actions { display:flex; align-items:flex-end; margin-left:auto; }
      .subhead { color:${theme.text}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:4px 8px; font-size:11px; }
      button { border:0; border-radius:999px; padding:4px 10px; font:inherit; background:${theme.buttonBg}; color:${theme.buttonText}; cursor:pointer; min-width:66px; font-size:11px; }
      button:disabled { opacity:.65; cursor:default; }
      @media (max-width: 640px) { .toolbar { flex-wrap:wrap; } .toolbar-actions { width:100%; justify-content:flex-end; margin-left:0; } }
      .summary { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px; }
      .summary-card { background:${theme.summaryBg}; border:1px solid ${theme.summaryBorder}; border-radius:14px; padding:10px; display:grid; gap:4px; }
      .label { text-transform:uppercase; letter-spacing:0.14em; font-size:10px; color:${theme.headText}; }
      .value { font-size:14px; color:${theme.title}; line-height:1.3; }
      .panel { padding:12px; display:grid; gap:10px; }
      .panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .link { color:${theme.link}; text-decoration:none; font-size:12px; font-weight:600; }
      .link:hover { text-decoration:underline; }
      .grid { display:grid; grid-template-columns:minmax(180px, 1fr) minmax(240px, 2fr); gap:8px 14px; }
      .cell-key { color:${theme.headText}; font-size:12px; }
      .cell-value { color:${theme.text}; font-size:13px; word-break:break-word; }
      .empty { color:${theme.text}; font-size:14px; }
      .note { color:${theme.muted}; font-size:11px; line-height:1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">HubSpot</p>
        <h1>${escapeHtml(title)}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Inspect the deal record with a lightweight pipeline and stage summary.</p>
            <div class="chips">
              <span class="chip">ID: ${escapeHtml(String(deal.id ?? 'Unknown'))}</span>
              <span class="chip">${escapeHtml(pipeline)}</span>
              <span class="chip">${escapeHtml(stage)}</span>
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="summary">
          <div class="summary-card"><div class="label">Amount</div><div class="value">${escapeHtml(amount ?? '—')}</div></div>
          <div class="summary-card"><div class="label">Pipeline</div><div class="value">${escapeHtml(pipeline)}</div></div>
          <div class="summary-card"><div class="label">Stage</div><div class="value">${escapeHtml(stage)}</div></div>
          <div class="summary-card"><div class="label">Close date</div><div class="value">${escapeHtml(closeDate)}</div></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div class="label">Deal detail</div>
          <span class="chip">Owner: ${escapeHtml(owner)}</span>
        </div>
        ${
          propertyRows(properties).length === 0
            ? '<p class="empty">This deal did not return any readable properties.</p>'
            : `<div class="grid">${propertyRows(properties)
                .map(([key, value]) => `<div class="cell-key">${escapeHtml(key)}</div><div class="cell-value">${escapeHtml(value)}</div>`)
                .join('')}</div>`
        }
      </section>
      <p class="note">This view emphasizes current pipeline position and commercial context before the full property table.</p>
    </div>
  `;

  bindRefresh();
  notifySizeChanged();
}

function bindRefresh() {
  root.querySelector<HTMLButtonElement>('#refresh')?.addEventListener('click', async () => {
    if (isRefreshing) return;
    isRefreshing = true;
    render(currentPayload);
    try {
      const result = await app.callServerTool({ name: 'hubspotGetDeal', arguments: currentArgs });
      render((result.structuredContent ?? {}) as DealPayload);
    } finally {
      isRefreshing = false;
      notifySizeChanged();
    }
  });
}

app.ontoolinput = ({ arguments: args }) => {
  currentArgs = args ?? {};
};

app.ontoolresult = (result) => {
  render((result.structuredContent ?? {}) as DealPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.deal) render(currentPayload);
};

app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
