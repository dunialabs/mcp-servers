import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, formatDate, getTheme, joinDefined } from './figma-shared.js';

type BrowserItem = {
  id?: string | null;
  kind?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  updatedAt?: string | null;
  badges?: string[];
  links?: Array<{ label: string; url: string }>;
};

type BrowserPayload = {
  kind?: 'figma-project-list' | 'figma-file-list' | 'figma-project-detail';
  title?: string;
  subtitle?: string;
  count?: number;
  items?: BrowserItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'figma-browser-view', version: '0.1.0' }, {}, { autoResize: true });
let payload: BrowserPayload = {};
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
  const theme = getTheme(isDarkTheme);
  const items = payload.items ?? [];
  root.innerHTML = `
    <style>
      ${baseShellStyles(theme)}
      .layout { display: grid; gap: 10px; }
      .grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
      .card { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--row-border); border-radius: 18px; background: rgba(255,255,255,${isDarkTheme ? '0.02' : '0.72'}); }
      .thumb { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 14px; border: 1px solid var(--row-border); background: rgba(255,255,255,0.03); }
      .item-title { margin: 0; font-size: 15px; color: var(--title); font-weight: 700; line-height: 1.35; }
      .item-subtitle { margin: 0; font-size: 12px; color: var(--muted); }
      .item-description { margin: 0; font-size: 12px; color: var(--text); line-height: 1.45; }
      .item-links { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; }
    </style>
    <div class="shell">
      <div class="panel hero">
        <div class="eyebrow">FIGMA</div>
        <h1 class="title">${escapeHtml(payload.title ?? 'Figma')}</h1>
        <p class="subtitle">${escapeHtml(payload.subtitle ?? 'Browse projects and files from Figma.')}</p>
        <div class="chips">
          <span class="chip">Results: ${escapeHtml(payload.count ?? items.length)}</span>
          ${payload.kind ? `<span class="chip">${escapeHtml(payload.kind.replace(/^figma-/, '').replaceAll('-', ' '))}</span>` : ''}
        </div>
      </div>
      <div class="panel content">
        <div class="toolbar">
          <p class="section-title">Browser</p>
          <div class="toolbar-right">Project and file browser</div>
        </div>
        ${items.length === 0 ? '<div class="empty">No items available for this result.</div>' : `
          <div class="grid">
            ${items.map((item) => `
              <article class="card">
                ${item.thumbnailUrl ? `<img class="thumb" src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.title ?? 'thumbnail')}" />` : ''}
                <div>
                  <h2 class="item-title">${escapeHtml(item.title ?? 'Untitled')}</h2>
                  <p class="item-subtitle">${escapeHtml(joinDefined([item.kind, item.updatedAt ? `Updated ${formatDate(item.updatedAt)}` : null]))}</p>
                </div>
                ${item.badges?.length ? `<div class="chips">${item.badges.map((badge) => `<span class="chip">${escapeHtml(badge)}</span>`).join('')}</div>` : ''}
                ${item.description ? `<p class="item-description">${escapeHtml(item.description)}</p>` : ''}
                ${item.links?.length ? `<div class="item-links">${item.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div>` : ''}
              </article>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
  notifySizeChanged();
}

app.ontoolresult = (result) => {
  payload = (result?.structuredContent as BrowserPayload | undefined) ?? {};
  render();
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in payload) render();
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
