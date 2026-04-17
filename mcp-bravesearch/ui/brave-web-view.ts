import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, formatDate, getTheme, stripHtml } from './brave-shared.js';

type WebItem = {
  title?: string | null;
  url?: string | null;
  description?: string | null;
  age?: string | null;
};

type NewsItem = {
  title?: string | null;
  url?: string | null;
  description?: string | null;
  age?: string | null;
  source?: string | null;
};

type Payload = {
  kind?: 'brave-web-results';
  query?: string;
  count?: number;
  items?: WebItem[];
  newsItems?: NewsItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'brave-web-view', version: '0.1.0' }, {}, { autoResize: true });
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
  const items = payload.items ?? [];
  const newsItems = payload.newsItems ?? [];

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .results { display: grid; gap: 0; }
      .result-item {
        padding: 12px 0;
        border-bottom: 1px solid var(--row-border);
        display: grid;
        gap: 4px;
      }
      .result-item:last-child { border-bottom: 0; }
      .result-url { font-size: 11px; color: var(--muted); word-break: break-all; }
      .result-title { font-size: 14px; font-weight: 700; color: var(--title); line-height: 1.35; }
      .result-desc { font-size: 12px; color: var(--text); line-height: 1.5; }
      .result-age { font-size: 11px; color: var(--muted); }
      .news-item {
        padding: 10px 0;
        border-bottom: 1px solid var(--row-border);
        display: grid;
        gap: 3px;
      }
      .news-item:last-child { border-bottom: 0; }
      .news-meta { display: flex; gap: 8px; align-items: center; font-size: 11px; color: var(--muted); }
      .news-source { font-weight: 600; color: var(--accent); }
      .link-tip { margin: 4px 0 0; font-size: 11px; color: var(--muted); text-align: center; opacity: 0.7; }
    </style>
    <div class="shell">
      <section class="panel hero">
        <p class="eyebrow">Brave Search</p>
        <h1>${escapeHtml(payload.query ? `"${payload.query}"` : 'Web Search')}</h1>
        <p class="subtitle">Web search results from Brave Search.</p>
        <div class="chips">
          <span class="chip">Results: ${payload.count ?? items.length}</span>
          ${newsItems.length ? `<span class="chip">News: ${newsItems.length}</span>` : ''}
        </div>
      </section>
      <section class="panel content">
        <div class="toolbar">
          <p class="section-title">Web Results</p>
          <span class="toolbar-right">${items.length} items</span>
        </div>
        ${items.length === 0
          ? '<div class="empty">No web results found.</div>'
          : `<div class="results">${items.map((item) => `
            <div class="result-item">
              <div class="result-url">
                ${item.url
                  ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>`
                  : ''}
              </div>
              <div class="result-title">${escapeHtml(item.title ?? 'Untitled')}</div>
              ${item.description ? `<div class="result-desc">${escapeHtml(stripHtml(item.description))}</div>` : ''}
              ${item.age ? `<div class="result-age">${escapeHtml(formatDate(item.age) || item.age)}</div>` : ''}
            </div>
          `).join('')}</div>`
        }
      </section>
      ${newsItems.length ? `
        <section class="panel content">
          <div class="toolbar">
            <p class="section-title">Related News</p>
            <span class="toolbar-right">${newsItems.length} items</span>
          </div>
          <div class="results">
            ${newsItems.map((item) => `
              <div class="news-item">
                <div class="news-meta">
                  ${item.source ? `<span class="news-source">${escapeHtml(item.source)}</span>` : ''}
                  ${item.age ? `<span>${escapeHtml(formatDate(item.age) || item.age)}</span>` : ''}
                </div>
                <div class="result-title">${escapeHtml(item.title ?? 'Untitled')}</div>
                ${item.description ? `<div class="result-desc">${escapeHtml(stripHtml(item.description))}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
      <p class="link-tip">Note: If clicking a link fails, right-click it and select "Open Link in Browser".</p>
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
