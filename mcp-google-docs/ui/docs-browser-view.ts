import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type DocumentItem = {
  id?: string | null;
  name?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
  owners?: string[] | null;
  webViewLink?: string | null;
};

type BrowserPayload = {
  kind?: 'gdocs-browser';
  mode?: 'list' | 'search';
  query?: string | null;
  count?: number;
  hasMore?: boolean;
  nextPageToken?: string | null;
  documents?: DocumentItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'docs-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentTool = 'gdocsListDocuments';
let isRefreshing = false;
let currentPayload: BrowserPayload = {};
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

function ownerLabel(document: DocumentItem): string {
  const owners = (document.owners ?? []).filter((value): value is string => Boolean(value));
  return owners.length > 0 ? owners.join(', ') : 'Unknown';
}

function render(payload: BrowserPayload) {
  currentPayload = payload;
  const documents = payload.documents ?? [];
  const mode = payload.mode ?? 'list';
  const title = mode === 'search' ? 'Search Results' : 'Documents';
  const subtitle =
    mode === 'search'
      ? `Showing documents that matched ${payload.query ? `"${payload.query}"` : 'your query'}.`
      : 'Browse readable Google Docs documents from Drive.';
  const theme = isDarkTheme
    ? {
        title: '#e8f0fe',
        text: '#a8c0f0',
        muted: '#6888c8',
        shellBg: 'radial-gradient(circle at top left, rgba(66, 133, 244, 0.14), transparent 34%), linear-gradient(180deg, #060d1a 0%, #040a14 100%)',
        panelBg: 'rgba(6, 14, 30, 0.97)',
        panelBorder: 'rgba(66, 133, 244, 0.14)',
        shadow: '0 10px 24px rgba(0, 0, 0, 0.40)',
        accent: '#6ba4f8',
        chipBg: '#0a1840',
        chipText: '#7eb0f8',
        headText: '#6888c8',
        rowBorder: 'rgba(66, 133, 244, 0.1)',
        link: '#7eb0f8',
        buttonBg: '#e8f0fe',
        buttonText: '#060d1a',
      }
    : {
        title: '#0d2860',
        text: '#2a4a8a',
        muted: '#4a6aaa',
        shellBg: 'radial-gradient(circle at top left, rgba(66, 133, 244, 0.10), transparent 36%), linear-gradient(180deg, #f0f4ff 0%, #e8f0fe 100%)',
        panelBg: 'rgba(255, 255, 255, 0.94)',
        panelBorder: 'rgba(66, 133, 244, 0.12)',
        shadow: '0 8px 20px rgba(10, 30, 80, 0.06)',
        accent: '#4285F4',
        chipBg: '#e8f0fe',
        chipText: '#2a6cd4',
        headText: '#6a8ac8',
        rowBorder: 'rgba(66, 133, 244, 0.08)',
        link: '#2a6cd4',
        buttonBg: '#0d2860',
        buttonText: '#ffffff',
      };

  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body {
        font-family: Georgia, serif;
        color: ${theme.title};
        background: transparent;
        padding: 0;
      }
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
      h1 { font-size: 22px; line-height: 1.08; color: ${theme.accent}; }
      .toolbar {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: nowrap;
      }
      .toolbar-main { min-width: 0; display: grid; gap: 6px; }
      .toolbar-actions { display: flex; align-items: flex-end; flex: 0 0 auto; margin-left: auto; }
      .subhead { color: ${theme.text}; font-size: 13px; line-height: 1.4; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        background: ${theme.chipBg};
        color: ${theme.chipText};
        padding: 4px 8px;
        font-size: 11px;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 4px 10px;
        font: inherit;
        background: ${theme.buttonBg};
        color: ${theme.buttonText};
        cursor: pointer;
        min-width: 66px;
        font-size: 11px;
      }
      button:disabled { opacity: 0.65; cursor: default; }
      @media (max-width: 640px) {
        .toolbar { flex-wrap: wrap; }
        .toolbar-actions { width: 100%; justify-content: flex-end; margin-left: 0; }
      }
      .panel { overflow: hidden; }
      .table-head, .table-row {
        display: grid;
        grid-template-columns: minmax(240px, 2.6fr) minmax(170px, 1.2fr) minmax(180px, 1.4fr);
        gap: 12px;
        align-items: center;
      }
      .table-head {
        padding: 9px 12px;
        border-bottom: 1px solid ${theme.rowBorder};
        color: ${theme.headText};
        font-size: 12px;
      }
      .table-body { max-height: 560px; overflow: auto; }
      .table-row {
        padding: 8px 12px;
        border-bottom: 1px solid ${theme.rowBorder};
        font-size: 13px;
      }
      .table-row:last-child { border-bottom: 0; }
      .name-title { font-size: 14px; font-weight: 700; line-height: 1.3; color: ${theme.title}; }
      .name-link {
        display: inline-flex;
        margin-top: 3px;
        color: ${theme.link};
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
      }
      .name-link:hover { text-decoration: underline; }
      .muted { color: ${theme.text}; font-size: 12px; }
      .empty { padding: 18px 14px; color: ${theme.text}; font-size: 14px; }
      .note { color: ${theme.muted}; font-size: 11px; line-height: 1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Docs</p>
        <h1>${escapeHtml(title)}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">${escapeHtml(subtitle)}</p>
            <div class="chips">
              <span class="chip">Results: ${escapeHtml(String(payload.count ?? documents.length))}</span>
              ${payload.query ? `<span class="chip">Query: ${escapeHtml(payload.query)}</span>` : ''}
              ${payload.hasMore ? '<span class="chip">More available</span>' : ''}
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="table-head">
          <div>Document</div>
          <div>Updated</div>
          <div>Owner</div>
        </div>
        <div class="table-body">
          ${documents.length === 0 ? '<div class="empty">No documents matched this request.</div>' : documents.map((document) => `
            <div class="table-row">
              <div>
                <div class="name-title">📄 ${escapeHtml(document.name || 'Untitled document')}</div>
                ${document.webViewLink ? `<a class="name-link" href="${escapeHtml(document.webViewLink)}" target="_blank" rel="noreferrer">Open in Docs</a>` : ''}
              </div>
              <div class="muted">${escapeHtml(formatDate(document.modifiedTime || document.createdTime))}</div>
              <div class="muted">${escapeHtml(ownerLabel(document))}</div>
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
      const result = await app.callServerTool({ name: currentTool, arguments: currentArgs });
      isRefreshing = false;
      render((result.structuredContent ?? {}) as BrowserPayload);
    } finally {
      isRefreshing = false;
      notifySizeChanged();
    }
  });
}

app.ontoolinput = ({ arguments: args, toolInfo }) => {
  currentArgs = args ?? {};
  if (toolInfo?.name === 'gdocsSearchDocuments') currentTool = 'gdocsSearchDocuments';
  if (toolInfo?.name === 'gdocsListDocuments') currentTool = 'gdocsListDocuments';
};

app.ontoolresult = (result) => {
  const payload = (result.structuredContent ?? {}) as BrowserPayload;
  currentTool = payload.mode === 'search' ? 'gdocsSearchDocuments' : 'gdocsListDocuments';
  render(payload);
};

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.documents) render(currentPayload);
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
