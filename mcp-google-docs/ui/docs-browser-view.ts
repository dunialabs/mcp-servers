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

function applyHost() {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
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

  root.innerHTML = `
    <style>
      html, body { margin: 0; padding: 0; min-height: 0; }
      body {
        font-family: Georgia, serif;
        color: #18212f;
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
        background:
          radial-gradient(circle at top left, rgba(231, 244, 255, 0.9), transparent 35%),
          linear-gradient(180deg, #f8fbff 0%, #fffdf8 100%);
      }
      .hero, .panel {
        background: rgba(255,255,255,0.93);
        border: 1px solid rgba(24,33,47,0.1);
        border-radius: 18px;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
      }
      .hero { padding: 12px; display: grid; gap: 8px; }
      .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 11px; color: #0f766e; }
      h1, p { margin: 0; }
      h1 { font-size: 22px; line-height: 1.08; }
      .toolbar {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: nowrap;
      }
      .toolbar-main { min-width: 0; display: grid; gap: 6px; }
      .toolbar-actions { display: flex; align-items: flex-end; flex: 0 0 auto; margin-left: auto; }
      .subhead { color: #5b6471; font-size: 13px; line-height: 1.4; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        background: #eef6ff;
        color: #1d4ed8;
        padding: 4px 8px;
        font-size: 11px;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 4px 10px;
        font: inherit;
        background: #18212f;
        color: white;
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
        border-bottom: 1px solid rgba(24,33,47,0.08);
        color: #667085;
        font-size: 12px;
      }
      .table-body { max-height: 560px; overflow: auto; }
      .table-row {
        padding: 8px 12px;
        border-bottom: 1px solid rgba(24,33,47,0.06);
        font-size: 13px;
      }
      .table-row:last-child { border-bottom: 0; }
      .name-title { font-size: 14px; font-weight: 700; line-height: 1.3; }
      .name-link {
        display: inline-flex;
        margin-top: 3px;
        color: #14532d;
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
      }
      .name-link:hover { text-decoration: underline; }
      .muted { color: #5b6471; font-size: 12px; }
      .empty { padding: 18px 14px; color: #5b6471; font-size: 14px; }
      .note { color: #667085; font-size: 11px; line-height: 1.45; }
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

app.onhostcontextchanged = () => applyHost();
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
