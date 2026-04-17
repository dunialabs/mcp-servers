import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme } from './canva-shared.js';

type ExportUrl = {
  url?: string;
  page?: number | null;
};

type Payload = {
  kind?: 'canva-export-result';
  status?: string | null;
  exportId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  urls?: ExportUrl[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'canva-export-view', version: '0.1.0' }, {}, { autoResize: true });
let payload: Payload = {};
let isDarkTheme = false;

function applyHost() {
  const context = app.getHostContext();
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context?.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
  isDarkTheme = detectDarkTheme(app);
}

function notifySizeChanged() {
  requestAnimationFrame(() => {
    void app.sendSizeChanged({
      width: Math.ceil(document.documentElement.scrollWidth),
      height: Math.ceil(document.documentElement.scrollHeight),
    });
  });
}

function render() {
  const t = getTheme(isDarkTheme);
  const urls = payload.urls ?? [];

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .result-list { display: grid; gap: 10px; }
      .result-card {
        padding: 12px;
        border-radius: 14px;
        background: ${t.contentBg};
        border: 1px solid ${t.rowBorder};
      }
      .result-title { color: ${t.title}; font-size: 14px; font-weight: 700; }
      .result-subtitle { margin-top: 4px; color: ${t.muted}; font-size: 12px; }
      .status { color: ${t.title}; font-size: 13px; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Canva</p>
        <h1>Export Result</h1>
        <p class="subtitle">Preview export status and generated download links.</p>
        <div class="chips">
          <span class="chip">Status: ${escapeHtml(payload.status ?? 'unknown')}</span>
          ${payload.exportId ? `<span class="chip">Job: ${escapeHtml(payload.exportId)}</span>` : ''}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Download Links</h2></div>
        <div class="content">
          ${
            payload.errorMessage
              ? `<div class="status">${escapeHtml(payload.errorCode ?? 'error')}: ${escapeHtml(payload.errorMessage)}</div>`
              : urls.length
                ? `<div class="result-list">${urls
                    .map(
                      (item, index) => `
                        <div class="result-card">
                          <div class="result-title">Export ${item.page ? `Page ${item.page}` : index + 1}</div>
                          <div class="result-subtitle">
                            ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open download URL</a>` : 'No URL available'}
                          </div>
                        </div>
                      `
                    )
                    .join('')}</div>`
                : '<div class="empty">No export URLs available yet.</div>'
          }
        </div>
      </section>
    </div>
  `;

  notifySizeChanged();
}

app.ontoolresult = (result) => {
  payload = (result.structuredContent ?? {}) as Payload;
  render();
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in payload) render();
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
