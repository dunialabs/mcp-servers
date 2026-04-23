import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type DatabasePayload = {
  kind?: 'notion-database';
  databaseId?: string | null;
  pageSize?: number | null;
  response?: { results?: any[]; has_more?: boolean; next_cursor?: string | null } | null;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'notion-database-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentPayload: DatabasePayload = {};
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
    void app.sendSizeChanged({ width: Math.ceil(document.documentElement.scrollWidth), height: Math.ceil(document.documentElement.scrollHeight) });
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function richTextPlain(richText?: any[]): string {
  return (richText ?? []).map((item) => item?.plain_text ?? '').join('').trim();
}

function propertyValue(property: any): string {
  if (!property) return '—';
  switch (property.type) {
    case 'title': return richTextPlain(property.title) || '—';
    case 'rich_text': return richTextPlain(property.rich_text) || '—';
    case 'number': return property.number == null ? '—' : String(property.number);
    case 'select': return property.select?.name ?? '—';
    case 'multi_select': return (property.multi_select ?? []).map((item: any) => item.name).join(', ') || '—';
    case 'status': return property.status?.name ?? '—';
    case 'date': return property.date?.start ?? '—';
    case 'checkbox': return property.checkbox ? 'True' : 'False';
    case 'url': return property.url ?? '—';
    case 'email': return property.email ?? '—';
    case 'phone_number': return property.phone_number ?? '—';
    case 'people': return (property.people ?? []).map((item: any) => item.name ?? item.id).join(', ') || '—';
    case 'relation': return `${(property.relation ?? []).length} linked`;
    case 'formula': return property.formula?.string ?? property.formula?.number ?? property.formula?.boolean ?? '—';
    case 'created_time': return property.created_time ?? '—';
    case 'last_edited_time': return property.last_edited_time ?? '—';
    default: return property.type ?? '—';
  }
}

function pageTitle(page: any): string {
  const properties = page?.properties ?? {};
  for (const value of Object.values(properties) as any[]) {
    if (value?.type === 'title') return richTextPlain(value.title) || 'Untitled';
  }
  return 'Untitled';
}

function collectColumns(results: any[]): string[] {
  const set = new Set<string>();
  for (const item of results) {
    for (const key of Object.keys(item?.properties ?? {})) set.add(key);
  }
  return Array.from(set).slice(0, 6);
}

function render(payload: DatabasePayload) {
  currentPayload = payload;
  const results = payload.response?.results ?? [];
  const columns = collectColumns(results);
  const theme = isDarkTheme
    ? {
        text: '#e5e7eb',
        muted: '#a1a1aa',
        shellBg: 'radial-gradient(circle at top left, rgba(91, 33, 182, 0.18), transparent 35%), linear-gradient(180deg, #111111 0%, #18181b 100%)',
        panelBg: 'rgba(24,24,27,0.94)',
        shadow: '0 8px 20px rgba(0,0,0,0.28)',
        accent: '#c4b5fd',
        chipBg: '#2b2047',
        chipText: '#ddd6fe',
        headText: '#a1a1aa',
        panelBorder: 'rgba(167, 139, 250, 0.12)',
        rowBorder: 'rgba(167, 139, 250, 0.1)',
        link: '#ddd6fe',
        buttonBg: '#f5f5f5',
        buttonText: '#111111',
      }
    : {
        text: '#18212f',
        muted: '#5b6471',
        shellBg: 'radial-gradient(circle at top left, rgba(246, 238, 255, 0.9), transparent 35%), linear-gradient(180deg, #fbf8ff 0%, #fffdf8 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(109, 40, 217, 0.1)',
        shadow: '0 8px 20px rgba(15,23,42,0.05)',
        accent: '#6d28d9',
        chipBg: '#f3e8ff',
        chipText: '#6d28d9',
        headText: '#667085',
        rowBorder: 'rgba(109, 40, 217, 0.07)',
        link: '#4c1d95',
        buttonBg: '#18212f',
        buttonText: '#ffffff',
      };
  root.innerHTML = `
    <style>
      html, body { margin:0; padding:0; min-height:0; }
      body { font-family:Georgia, serif; color:${theme.text}; background:transparent; padding:0; }
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
      .panel { overflow:hidden; }
      .table-scroll { overflow:auto; max-height:640px; }
      .table-head, .table-row { display:grid; grid-template-columns:minmax(180px,1.8fr) repeat(${Math.max(columns.length, 1)}, minmax(120px, 1fr)); gap:12px; align-items:center; min-width:${180 + Math.max(columns.length, 1) * 120}px; }
      .table-head { padding:9px 12px; border-bottom:1px solid ${theme.rowBorder}; color:${theme.headText}; font-size:12px; position:sticky; top:0; z-index:1; background:${theme.panelBg}; }
      .table-row { padding:8px 12px; border-bottom:1px solid ${theme.rowBorder}; font-size:13px; }
      .table-row:last-child { border-bottom:0; }
      .name-cell { font-size:13px; font-weight:700; }
      .muted { color:${theme.muted}; font-size:12px; }
      .item-link { color:${theme.link}; text-decoration:none; font-size:12px; font-weight:600; }
      .item-link:hover { text-decoration:underline; }
      .empty { padding:18px 14px; color:${theme.muted}; font-size:14px; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Notion</p>
        <h1>Database Results</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Review database rows in a compact table without losing the original JSON fallback.</p>
            <div class="chips">
              <span class="chip">Rows: ${escapeHtml(String(results.length))}</span>
              <span class="chip">Columns: ${escapeHtml(String(columns.length))}</span>
              ${payload.response?.has_more ? '<span class="chip">More available</span>' : ''}
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="table-scroll">
          <div class="table-head">
            <div>Row</div>
            ${columns.length === 0 ? '<div>Properties</div>' : columns.map((column) => `<div>${escapeHtml(column)}</div>`).join('')}
          </div>
          ${results.length === 0 ? '<div class="empty">No database rows matched this request.</div>' : results.map((item) => `
            <div class="table-row">
              <div>
                <div class="name-cell">📄 ${escapeHtml(pageTitle(item))}</div>
                <div class="muted">${item?.url ? `<a class="item-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open in Notion</a>` : ''}</div>
              </div>
              ${columns.length === 0 ? `<div class="muted">${escapeHtml(String(Object.keys(item?.properties ?? {}).length))} properties</div>` : columns.map((column) => `<div class="muted">${escapeHtml(String(propertyValue(item?.properties?.[column])))}</div>`).join('')}
            </div>
          `).join('')}
        </div>
      </section>
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
      const result = await app.callServerTool({ name: 'notionQueryDatabase', arguments: currentArgs });
      isRefreshing = false;
      render((result.structuredContent ?? {}) as DatabasePayload);
    } finally {
      isRefreshing = false;
      notifySizeChanged();
    }
  });
}

app.ontoolinput = ({ arguments: args }) => { currentArgs = args ?? {}; };
app.ontoolresult = (result) => { render((result.structuredContent ?? {}) as DatabasePayload); };
app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.response) render(currentPayload);
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
