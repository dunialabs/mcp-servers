import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme } from './postgres-shared.js';

type TableItem = {
  schemaName?: string | null;
  tableName?: string | null;
  sizeBytes?: number | null;
};

type Payload = {
  kind?: 'postgres-table-list';
  schema?: string | null;
  count?: number;
  items?: TableItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'postgres-tables-view', version: '1.0.0' }, {}, { autoResize: true });
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

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function render() {
  const t = getTheme(isDarkTheme);
  const items = payload.items ?? [];

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .name-cell { display: grid; gap: 3px; }
      .name-cell strong { color: var(--title); font-size: 13px; }
      .name-cell span { color: var(--muted); font-size: 12px; }
    </style>
    <div class="shell">
      <section class="panel hero">
        <p class="eyebrow">Postgres</p>
        <h1>${escapeHtml(payload.schema ?? 'Tables')}</h1>
        <p class="subtitle">Browse tables before drilling into structure details.</p>
        <div class="chips">
          <span class="chip">Tables: ${payload.count ?? items.length}</span>
        </div>
      </section>
      <section class="panel content">
        <div class="toolbar">
          <p class="section-title">Tables</p>
          <span class="toolbar-right">${items.length} rows</span>
        </div>
        ${items.length === 0
          ? '<div class="empty">No tables found.</div>'
          : `<table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Schema</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item) => `
                    <tr>
                      <td><strong>${escapeHtml(item.tableName ?? 'Untitled')}</strong></td>
                      <td>${escapeHtml(item.schemaName ?? payload.schema ?? 'public')}</td>
                      <td>${formatSize(item.sizeBytes)}</td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>`}
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
