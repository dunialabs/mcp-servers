import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type PagePayload = {
  kind?: 'notion-page';
  page?: any;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'notion-page-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentPayload: PagePayload = {};
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

function pageTitle(page: any): string {
  const properties = page?.properties ?? {};
  for (const value of Object.values(properties) as any[]) {
    if (value?.type === 'title') return richTextPlain(value.title) || 'Untitled page';
  }
  return 'Untitled page';
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

function formatDate(value?: string | null): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function render(payload: PagePayload) {
  currentPayload = payload;
  const page = payload.page ?? {};
  const properties = Object.entries(page?.properties ?? {});
  const theme = isDarkTheme
    ? {
        text: '#e5e7eb',
        muted: '#a1a1aa',
        shellBg: 'radial-gradient(circle at top left, rgba(91, 33, 182, 0.18), transparent 35%), linear-gradient(180deg, #111111 0%, #18181b 100%)',
        panelBg: 'rgba(24,24,27,0.94)',
        panelBorder: 'rgba(244,244,245,0.08)',
        shadow: '0 8px 20px rgba(0,0,0,0.28)',
        accent: '#c4b5fd',
        chipBg: '#2b2047',
        chipText: '#ddd6fe',
        key: '#a1a1aa',
        value: '#d1d5db',
        rowBorder: 'rgba(244,244,245,0.08)',
        link: '#86efac',
      }
    : {
        text: '#18212f',
        muted: '#5b6471',
        shellBg: 'radial-gradient(circle at top left, rgba(246, 238, 255, 0.9), transparent 35%), linear-gradient(180deg, #fbf8ff 0%, #fffdf8 100%)',
        panelBg: 'rgba(255,255,255,0.93)',
        panelBorder: 'rgba(24,33,47,0.1)',
        shadow: '0 8px 20px rgba(15,23,42,0.05)',
        accent: '#6d28d9',
        chipBg: '#f3e8ff',
        chipText: '#6d28d9',
        key: '#667085',
        value: '#273244',
        rowBorder: 'rgba(24,33,47,0.06)',
        link: '#14532d',
      };
  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body { font-family: Georgia, serif; color: ${theme.text}; background: transparent; padding: 0; }
      .shell { display:grid; gap:12px; margin:10px; padding:10px; border-radius:22px; overflow:hidden; background: ${theme.shellBg}; }
      .hero, .panel { background: ${theme.panelBg}; border:1px solid ${theme.panelBorder}; border-radius:18px; box-shadow:${theme.shadow}; }
      .hero, .panel { padding:12px; }
      .hero { display:grid; gap:8px; }
      .eyebrow { margin:0; text-transform:uppercase; letter-spacing:0.16em; font-size:11px; color:${theme.accent}; }
      h1,p { margin:0; }
      h1 { font-size:22px; line-height:1.08; }
      .toolbar { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:nowrap; }
      .toolbar-main { min-width:0; display:grid; gap:6px; }
      .toolbar-actions { display:flex; align-items:flex-end; margin-left:auto; }
      .subhead { color:${theme.muted}; font-size:13px; line-height:1.4; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; }
      .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; background:${theme.chipBg}; color:${theme.chipText}; padding:4px 8px; font-size:11px; }
      button { border:0; border-radius:999px; padding:4px 10px; font:inherit; background:#18212f; color:white; cursor:pointer; min-width:66px; font-size:11px; }
      button:disabled { opacity:.65; cursor:default; }
      .panel-grid { display:grid; gap:10px; }
      .row { display:grid; grid-template-columns: 140px minmax(0, 1fr); gap:12px; padding:8px 0; border-bottom:1px solid ${theme.rowBorder}; }
      .row:last-child { border-bottom:0; }
      .key { color:${theme.key}; font-size:11px; text-transform:uppercase; letter-spacing:0.14em; }
      .value { color:${theme.value}; font-size:13px; line-height:1.45; word-break:break-word; }
      .section-label { text-transform:uppercase; letter-spacing:0.14em; font-size:11px; color:${theme.key}; margin-bottom:4px; }
      .doc-link { color:${theme.link}; text-decoration:none; font-size:12px; font-weight:600; }
      .doc-link:hover { text-decoration:underline; }
      @media (max-width:640px) { .toolbar { flex-wrap:wrap; } .toolbar-actions { width:100%; justify-content:flex-end; margin-left:0; } .row { grid-template-columns:1fr; gap:4px; } }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Notion</p>
        <h1>${escapeHtml(pageTitle(page))}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Inspect page metadata and properties without leaving the client.</p>
            <div class="chips">
              <span class="chip">Object: ${escapeHtml(page?.object ?? 'page')}</span>
              <span class="chip">Archived: ${page?.archived ? 'Yes' : 'No'}</span>
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="section-label">Details</div>
        <div class="panel-grid">
          <div class="row"><div class="key">Updated</div><div class="value">${escapeHtml(formatDate(page?.last_edited_time ?? null))}</div></div>
          <div class="row"><div class="key">Created</div><div class="value">${escapeHtml(formatDate(page?.created_time ?? null))}</div></div>
          <div class="row"><div class="key">Parent</div><div class="value">${escapeHtml(page?.parent?.type ?? 'Unknown')}</div></div>
          <div class="row"><div class="key">Open</div><div class="value">${page?.url ? `<a class="doc-link" href="${escapeHtml(page.url)}" target="_blank" rel="noreferrer">Open in Notion</a>` : '—'}</div></div>
        </div>
      </section>
      <section class="panel">
        <div class="section-label">Properties</div>
        <div class="panel-grid">
          ${properties.length === 0 ? '<div class="value">No page properties returned.</div>' : properties.map(([name, property]) => `<div class="row"><div class="key">${escapeHtml(name)}</div><div class="value">${escapeHtml(String(propertyValue(property)))}</div></div>`).join('')}
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
      const result = await app.callServerTool({ name: 'notionGetPage', arguments: currentArgs });
      render((result.structuredContent ?? {}) as PagePayload);
    } finally {
      isRefreshing = false;
      notifySizeChanged();
    }
  });
}

app.ontoolinput = ({ arguments: args }) => { currentArgs = args ?? {}; };
app.ontoolresult = (result) => { render((result.structuredContent ?? {}) as PagePayload); };
app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.page) render(currentPayload);
};
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
