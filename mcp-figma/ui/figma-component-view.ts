import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme, joinDefined } from './figma-shared.js';

type ComponentItem = {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  key?: string | null;
  containingFrame?: string | null;
  setName?: string | null;
};

type ComponentPayload = {
  kind?: 'figma-component-summary';
  title?: string;
  subtitle?: string;
  badges?: string[];
  items?: ComponentItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'figma-component-view', version: '0.1.0' }, {}, { autoResize: true });
let payload: ComponentPayload = {};
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
      .list { display: grid; gap: 0; border-top: 1px solid var(--row-border); }
      .row { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr); }
      .cell { font-size: 13px; line-height: 1.5; color: var(--text); word-break: break-word; }
      .head { color: var(--head-text); text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; font-weight: 700; }
      @media (max-width: 860px) { .row { grid-template-columns: 1fr; } }
    </style>
    <div class="shell">
      <div class="panel hero">
        <div class="eyebrow">FIGMA</div>
        <h1 class="title">${escapeHtml(payload.title ?? 'Components')}</h1>
        <p class="subtitle">${escapeHtml(payload.subtitle ?? 'Review reusable components and component sets from this file.')}</p>
        ${payload.badges?.length ? `<div class="chips">${payload.badges.map((badge) => `<span class="chip">${escapeHtml(badge)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="panel content">
        <div class="toolbar"><p class="section-title">Component Preview Summary</p><div class="toolbar-right">${items.length} items</div></div>
        ${items.length === 0 ? '<div class="empty">No components found for this file.</div>' : `
          <div class="list">
            <div class="row">
              <div class="cell head">Component</div>
              <div class="cell head">Frame / Set</div>
              <div class="cell head">Key</div>
            </div>
            ${items.map((item) => `
              <div class="row">
                <div class="cell">
                  <div style="font-weight:700;color:var(--title)">${escapeHtml(item.name ?? 'Untitled component')}</div>
                  ${item.description ? `<div class="muted" style="font-size:12px">${escapeHtml(item.description)}</div>` : ''}
                </div>
                <div class="cell">${escapeHtml(joinDefined([item.containingFrame, item.setName])) || '—'}</div>
                <div class="cell muted">${escapeHtml(item.key ?? item.id ?? '—')}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
  notifySizeChanged();
}

app.ontoolresult = (result) => {
  payload = (result?.structuredContent as ComponentPayload | undefined) ?? {};
  render();
};

app.onhostcontextchanged = () => {
  applyHost();
  if ('kind' in payload) render();
};

void app.connect(new PostMessageTransport(window.parent, window.parent)).then(() => {
  applyHost();
});
