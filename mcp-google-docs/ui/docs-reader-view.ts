import { App, PostMessageTransport, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';

type ReaderPayload = {
  kind?: 'gdocs-reader';
  documentId?: string | null;
  title?: string | null;
  content?: string | null;
  format?: string | null;
  revisionId?: string | null;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'docs-reader-view', version: '0.1.0' }, {}, { autoResize: true });
let currentArgs: Record<string, unknown> = {};
let currentPayload: ReaderPayload = {};
let isRefreshing = false;

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

function documentUrl(documentId?: string | null): string | null {
  return documentId ? `https://docs.google.com/document/d/${documentId}/edit` : null;
}

function render(payload: ReaderPayload) {
  currentPayload = payload;
  const openUrl = documentUrl(payload.documentId);
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
      h1, p, pre { margin: 0; }
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
      .panel { padding: 12px; display: grid; gap: 8px; }
      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .label { text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px; color: #667085; }
      .doc-link {
        color: #14532d;
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
      }
      .doc-link:hover { text-decoration: underline; }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        font-family: "SFMono-Regular", "Menlo", monospace;
        font-size: 12px;
        line-height: 1.55;
        color: #273244;
        background: rgba(248, 251, 255, 0.82);
        border: 1px solid rgba(24,33,47,0.08);
        border-radius: 14px;
        padding: 12px;
        max-height: 720px;
        overflow: auto;
      }
      .empty { color: #5b6471; font-size: 14px; }
      .note { color: #667085; font-size: 11px; line-height: 1.45; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Google Docs</p>
        <h1>${escapeHtml(payload.title || 'Untitled document')}</h1>
        <div class="toolbar">
          <div class="toolbar-main">
            <p class="subhead">Read document content directly in the client while preserving the original structured fallback.</p>
            <div class="chips">
              <span class="chip">Format: ${escapeHtml(payload.format || 'markdown')}</span>
            </div>
          </div>
          <div class="toolbar-actions">
            <button id="refresh" ${isRefreshing ? 'disabled' : ''}>${isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <div class="label">Content</div>
          ${openUrl ? `<a class="doc-link" href="${escapeHtml(openUrl)}" target="_blank" rel="noreferrer">Open in Docs</a>` : ''}
        </div>
        ${payload.content ? `<pre>${escapeHtml(payload.content)}</pre>` : '<p class="empty">This document returned no readable content.</p>'}
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
      const result = await app.callServerTool({ name: 'gdocsReadDocument', arguments: currentArgs });
      render((result.structuredContent ?? {}) as ReaderPayload);
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
  render((result.structuredContent ?? {}) as ReaderPayload);
};

app.onhostcontextchanged = () => applyHost();
app.connect(new PostMessageTransport(window.parent, window.parent)).then(applyHost);
