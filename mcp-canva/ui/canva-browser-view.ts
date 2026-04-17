import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, formatDate, getTheme } from './canva-shared.js';

type BrowserItem = {
  id?: string;
  kind?: string;
  title?: string | null;
  subtitle?: string | null;
  thumbnailUrl?: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
  viewUrl?: string | null;
  editUrl?: string | null;
};

type Payload = {
  kind?: 'canva-design-list' | 'canva-folder-item-list';
  title?: string;
  subtitle?: string;
  count?: number;
  continuation?: string | null;
  items?: BrowserItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'canva-browser-view', version: '0.1.0' }, {}, { autoResize: true });
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
      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .card {
        padding: 12px;
        border-radius: 16px;
        background: ${t.contentBg};
        border: 1px solid ${t.rowBorder};
      }
      .thumb {
        width: 100%;
        aspect-ratio: 16 / 10;
        border-radius: 12px;
        overflow: hidden;
        background: ${t.panelBg};
        border: 1px solid ${t.panelBorder};
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
      }
      .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .thumb-empty { color: ${t.muted}; font-size: 12px; }
      .card-title { color: ${t.title}; font-size: 14px; font-weight: 700; line-height: 1.35; }
      .card-subtitle { margin-top: 4px; color: ${t.muted}; font-size: 12px; line-height: 1.45; min-height: 18px; }
      .meta { margin-top: 8px; color: ${t.text}; font-size: 12px; line-height: 1.5; }
      .links { display: flex; gap: 12px; margin-top: 10px; font-size: 12px; font-weight: 600; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Canva</p>
        <h1>${escapeHtml(payload.title ?? 'Library')}</h1>
        <p class="subtitle">${escapeHtml(payload.subtitle ?? 'Browse Canva designs and assets.')}</p>
        <div class="chips">
          <span class="chip">Count: ${payload.count ?? 0}</span>
          ${payload.continuation ? '<span class="chip">More available</span>' : ''}
        </div>
      </section>
      <section class="panel">
        <div class="content">
          ${
            items.length
              ? `<div class="grid">${items
                  .map(
                    (item) => `
                      <article class="card">
                        <div class="thumb">
                          ${
                            item.thumbnailUrl
                              ? `<img src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.title ?? 'Thumbnail')}" />`
                              : `<div class="thumb-empty">${escapeHtml(item.kind ?? 'Item')}</div>`
                          }
                        </div>
                        <div class="card-title">${escapeHtml(item.title ?? 'Untitled')}</div>
                        <div class="card-subtitle">${escapeHtml(item.subtitle ?? '')}</div>
                        <div class="meta">
                          <div>Type: ${escapeHtml(item.kind ?? 'item')}</div>
                          <div>Updated: ${escapeHtml(formatDate(item.updatedAt ?? item.createdAt ?? null))}</div>
                        </div>
                        <div class="links">
                          ${item.viewUrl ? `<a href="${escapeHtml(item.viewUrl)}" target="_blank" rel="noopener noreferrer">Open</a>` : ''}
                          ${item.editUrl ? `<a href="${escapeHtml(item.editUrl)}" target="_blank" rel="noopener noreferrer">Edit</a>` : ''}
                        </div>
                      </article>
                    `
                  )
                  .join('')}</div>`
              : '<div class="empty">No designs or assets found.</div>'
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
