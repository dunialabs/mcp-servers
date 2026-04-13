import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type SearchResponse = {
  results?: any[];
  next_cursor?: string | null;
  has_more?: boolean;
};

type BrowserPayload = {
  kind?: 'notion-browser';
  mode?: 'search';
  query?: string | null;
  filter?: { value?: 'page' | 'database'; property?: 'object' } | null;
  response?: SearchResponse | null;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'notion-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let currentPayload: BrowserPayload = {};
let currentArgs: Record<string, unknown> = {};
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

function richTextPlain(richText?: any[]): string {
  return (richText ?? []).map((item) => item?.plain_text ?? '').join('').trim();
}

function titleFromItem(item: any): string {
  if (item?.object === 'database') return richTextPlain(item.title) || 'Untitled database';
  const properties = item?.properties ?? {};
  for (const value of Object.values(properties) as any[]) {
    if (value?.type === 'title') return richTextPlain(value.title) || 'Untitled page';
  }
  return item?.url ? 'Untitled page' : 'Untitled result';
}

function subtitleFromItem(item: any): string {
  if (item?.object === 'database') {
    const propertyCount = Object.keys(item?.properties ?? {}).length;
    return `${propertyCount} properties`;
  }
  const parentType = item?.parent?.type?.replaceAll('_', ' ') ?? 'page';
  return `Parent: ${parentType}`;
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

function render(payload: BrowserPayload) {
  currentPayload = payload;
  const results = payload.response?.results ?? [];
  const theme = isDarkTheme
    ? {
        text: '#e5e7eb',
        muted: '#a1a1aa',
        shellBg: 'radial-gradient(circle at top left, rgba(91, 33, 182, 0.18), transparent 35%), linear-gradient(180deg, #111111 0%, #18181b 100%)',
        panelBg: 'rgba(24,24,27,0.94)',
        panelBorder: 'rgba(244, 244, 245, 0.08)',
        shadow: '0 8px 20px rgba(0,0,0,0.28)',
        accent: '#c4b5fd',
        chipBg: '#2b2047',
        chipText: '#ddd6fe',
        headText: '#a1a1aa',
        rowBorder: 'rgba(244,244,245,0.08)',
        link: '#ddd6fe',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
      }
    : {
        text: '#18212f',
        muted: '#5b6471',
        shellBg: 'radial-gradient(circle at top left, rgba(246, 238, 255, 0.9), transparent 35%), linear-gradient(180deg, #fbf8ff 0%, #fffdf8 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(24,33,47,0.1)',
        shadow: '0 8px 20px rgba(15, 23, 42, 0.05)',
        accent: '#6d28d9',
        chipBg: '#f3e8ff',
        chipText: '#6d28d9',
        headText: '#667085',
        rowBorder: 'rgba(24,33,47,0.06)',
        link: '#4c1d95',
        buttonBg: '#18212f',
        buttonText: '#ffffff',
      };
  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body { font-family: Georgia, serif; color: ${theme.text}; background: transparent; padding: 0; }
      .shell {
        display: grid;
        gap: 12px;
        margin: 10px;
        padding: 10px;
        border-radius: 22px;
        overflow: hidden;
        background: ${theme.shellBg};
      }
      .hero, .panel {
        background: ${theme.panelBg};
        border: 1px solid ${theme.panelBorder};
        border-radius: 18px;
        box-shadow: ${theme.shadow};
      }
      .hero { padding: 12px; display: grid; gap: 8px; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: ${theme.accent}; }
      h1, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; }
      .toolbar { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:nowrap; }
      .toolbar-main { min-width:0; display:grid; gap:6px; }
      .toolbar-actions { display:flex; align-items:flex-end; margin-left:auto; }
      .subhead { color:${theme.muted}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:4px 8px; font-size:11px; }
      button { border:0; border-radius:999px; padding:4px 10px; font:inherit; background:${theme.buttonBg}; color:${theme.buttonText}; cursor:pointer; min-width:66px; font-size:11px; }
      button:disabled { opacity:0.65; cursor:default; }
      @media (max-width: 640px) { .toolbar { flex-wrap:wrap; } .toolbar-actions { width:100%; justify-content:flex-end; margin-left:0; } }
      .panel { overflow:hidden; }
      .table-head, .table-row { display:grid; grid-template-columns:minmax(280px,2.4fr) minmax(160px,1fr) minmax(140px,0.8fr); gap:12px; align-items:center; }
      .table-head { padding:9px 12px; border-bottom:1px solid ${theme.rowBorder}; color:${theme.headText}; font-size:12px; }
      .table-body { max-height: 620px; overflow:auto; }
      .table-row { padding:8px 12px; border-bottom:1px solid ${theme.rowBorder}; font-size:13px; }
      .table-row:last-child { border-bottom:0; }
      .item-title { font-size:14px; font-weight:700; line-height:1.3; }
      .item-link { display:inline-flex; margin-top:3px; color:${theme.link}; text-decoration:none; font-size:12px; font-weight:600; }
      .item-link:hover { text-decoration:underline; }
      .muted { color:${theme.muted}; font-size:12px; }
      .empty { padding:18px 14px; color:${theme.muted}; font-size:14px; }
      .note { color:${theme.headText}; font-size:11px; line-height:1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Notion</p>
        <h1>Search Results</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Browse pages and databases that matched ${escapeHtml(payload.query ?? 'your query')}.</p>
            <div class="chips">
              <span class="chip">Results: ${escapeHtml(String(results.length))}</span>
              ${payload.query ? `<span class="chip">Query: ${escapeHtml(payload.query)}</span>` : ''}
              ${payload.filter?.value ? `<span class="chip">Type: ${escapeHtml(payload.filter.value)}</span>` : ''}
              ${payload.response?.has_more ? '<span class="chip">More available</span>' : ''}
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="table-head">
          <div>Item</div>
          <div>Updated</div>
          <div>Type</div>
        </div>
        <div class="table-body">
          ${results.length === 0 ? '<div class="empty">No Notion content matched this request.</div>' : results.map((item) => `
            <div class="table-row">
              <div>
                <div class="item-title">${item?.object === 'database' ? '🗂️' : '📄'} ${escapeHtml(titleFromItem(item))}</div>
                <div class="muted">${escapeHtml(subtitleFromItem(item))}</div>
                ${item?.url ? `<a class="item-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open in Notion</a>` : ''}
              </div>
              <div class="muted">${escapeHtml(formatDate(item?.last_edited_time ?? null))}</div>
              <div class="muted">${escapeHtml(item?.object ?? 'unknown')}</div>
            </div>
          `).join('')}
        </div>
      </section>
      <p class="note">Claude may block direct left-click navigation. If needed, use right-click and open the link in your browser.</p>
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
      const result = await app.callServerTool({ name: 'notionSearch', arguments: currentArgs });
      render((result.structuredContent ?? {}) as BrowserPayload);
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
  render((result.structuredContent ?? {}) as BrowserPayload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.response) render(currentPayload);
};
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
