import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, formatDate, getTheme } from './canva-shared.js';

type MetadataPayload = {
  kind?: 'canva-design-detail' | 'canva-asset-detail';
  title?: string;
  subtitle?: string;
  thumbnailUrl?: string | null;
  viewUrl?: string | null;
  editUrl?: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
  meta?: Array<{ label: string; value: string }>;
  tags?: string[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'canva-metadata-view', version: '0.1.0' }, {}, { autoResize: true });
let payload: MetadataPayload = {};
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
  const meta = payload.meta ?? [];
  const tags = payload.tags ?? [];

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .layout { display: grid; gap: 10px; }
      .thumb {
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 14px;
        overflow: hidden;
        background: ${t.contentBg};
        border: 1px solid ${t.rowBorder};
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .thumb-empty { color: ${t.muted}; font-size: 12px; }
      .meta { display: grid; gap: 10px; }
      .meta-row { display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 10px 0; border-top: 1px solid ${t.rowBorder}; }
      .meta-row:first-child { border-top: 0; padding-top: 0; }
      .meta-label { color: ${t.muted}; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
      .meta-value { color: ${t.title}; font-size: 13px; line-height: 1.45; word-break: break-word; }
      .actions { display: flex; gap: 12px; }
    </style>
    <div class="shell">
      <section class="hero">
        <p class="eyebrow">Canva</p>
        <h1>${escapeHtml(payload.title ?? 'Metadata')}</h1>
        <p class="subtitle">${escapeHtml(payload.subtitle ?? 'Preview Canva metadata')}</p>
        <div class="chips">
          ${payload.createdAt ? `<span class="chip">Created: ${escapeHtml(formatDate(payload.createdAt))}</span>` : ''}
          ${payload.updatedAt ? `<span class="chip">Updated: ${escapeHtml(formatDate(payload.updatedAt))}</span>` : ''}
          ${tags.slice(0, 3).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}
        </div>
      </section>
      <section class="panel">
        <div class="content">
          <div class="layout">
            <div class="thumb">
              ${
                payload.thumbnailUrl
                  ? `<img src="${escapeHtml(payload.thumbnailUrl)}" alt="${escapeHtml(payload.title ?? 'Preview')}" />`
                  : '<div class="thumb-empty">No preview available</div>'
              }
            </div>
            <div class="actions">
              ${payload.viewUrl ? `<a href="${escapeHtml(payload.viewUrl)}" target="_blank" rel="noopener noreferrer">Open</a>` : ''}
              ${payload.editUrl ? `<a href="${escapeHtml(payload.editUrl)}" target="_blank" rel="noopener noreferrer">Edit</a>` : ''}
            </div>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Details</h2></div>
        <div class="content">
          <div class="meta">
            ${meta.length
              ? meta.map((entry) => `<div class="meta-row"><div class="meta-label">${escapeHtml(entry.label)}</div><div class="meta-value">${escapeHtml(entry.value)}</div></div>`).join('')
              : '<div class="empty">No metadata available.</div>'}
          </div>
        </div>
      </section>
    </div>
  `;

  notifySizeChanged();
}

app.ontoolresult = (result) => {
  payload = (result.structuredContent ?? {}) as MetadataPayload;
  render();
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in payload) render();
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
