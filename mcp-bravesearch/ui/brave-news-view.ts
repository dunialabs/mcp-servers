import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, formatDate, getTheme } from './brave-shared.js';

type NewsItem = {
  title?: string | null;
  url?: string | null;
  description?: string | null;
  age?: string | null;
  pageAge?: string | null;
  source?: string | null;
};

type Payload = {
  kind?: 'brave-news-results';
  query?: string;
  count?: number;
  items?: NewsItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'brave-news-view', version: '0.1.0' }, {}, { autoResize: true });
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

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .feed { display: grid; gap: 0; }
      .feed-item {
        padding: 14px 0;
        border-bottom: 1px solid var(--row-border);
        display: grid;
        gap: 6px;
      }
      .feed-item:last-child { border-bottom: 0; }
      .feed-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .feed-source {
        font-size: 11px;
        font-weight: 700;
        color: var(--accent);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .feed-age { font-size: 11px; color: var(--muted); }
      .feed-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--title);
        line-height: 1.35;
      }
      .feed-title a { color: var(--title); }
      .feed-title a:hover { color: var(--accent); text-decoration: none; }
      .feed-desc { font-size: 12px; color: var(--text); line-height: 1.55; }
      .link-tip { margin: 4px 0 0; font-size: 11px; color: var(--muted); text-align: center; opacity: 0.7; }
    </style>
    <div class="shell">
      <section class="panel hero">
        <p class="eyebrow">Brave Search</p>
        <h1>${escapeHtml(payload.query ? `"${payload.query}"` : 'News Search')}</h1>
        <p class="subtitle">Latest news results from Brave Search.</p>
        <div class="chips">
          <span class="chip">Results: ${payload.count ?? items.length}</span>
        </div>
      </section>
      <section class="panel content">
        <div class="toolbar">
          <p class="section-title">News Feed</p>
          <span class="toolbar-right">${items.length} articles</span>
        </div>
        ${items.length === 0
          ? '<div class="empty">No news results found.</div>'
          : `<div class="feed">${items.map((item) => `
            <div class="feed-item">
              <div class="feed-meta">
                ${item.source ? `<span class="feed-source">${escapeHtml(item.source)}</span>` : ''}
                ${item.pageAge || item.age
                  ? `<span class="feed-age">${escapeHtml(formatDate(item.pageAge ?? item.age) || String(item.pageAge ?? item.age ?? ''))}</span>`
                  : ''}
              </div>
              <div class="feed-title">
                ${item.url
                  ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title ?? 'Untitled')}</a>`
                  : escapeHtml(item.title ?? 'Untitled')}
              </div>
              ${item.description ? `<div class="feed-desc">${escapeHtml(item.description)}</div>` : ''}
            </div>
          `).join('')}</div>`
        }
      </section>
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
