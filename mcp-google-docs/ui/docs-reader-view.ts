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

function documentUrl(documentId?: string | null): string | null {
  return documentId ? `https://docs.google.com/document/d/${documentId}/edit` : null;
}

function render(payload: ReaderPayload) {
  currentPayload = payload;
  const openUrl = documentUrl(payload.documentId);
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
        contentBg: 'rgba(10, 18, 42, 0.97)',
        contentBorder: 'rgba(66, 133, 244, 0.10)',
        contentText: '#c8d8f0',
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
        contentBg: 'rgba(240, 244, 255, 0.82)',
        contentBorder: 'rgba(66, 133, 244, 0.10)',
        contentText: '#1a3060',
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
      h1, p, pre { margin: 0; }
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
      .panel { padding: 12px; display: grid; gap: 8px; }
      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .label { text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px; color: ${theme.accent}; }
      .doc-link {
        color: ${theme.link};
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
        color: ${theme.contentText};
        background: ${theme.contentBg};
        border: 1px solid ${theme.contentBorder};
        border-radius: 14px;
        padding: 12px;
        max-height: 720px;
        overflow: auto;
      }
      .empty { color: ${theme.text}; font-size: 14px; }
      .note { color: ${theme.muted}; font-size: 11px; line-height: 1.45; }
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
      isRefreshing = false;
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

app.onhostcontextchanged = () => {
  applyHost();
  if (currentPayload.title || currentPayload.content) render(currentPayload);
};
void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
