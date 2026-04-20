import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme } from './mysql-shared.js';

type TableItem = {
  tableName?: string | null;
  engine?: string | null;
  tableRows?: number | null;
  sizeMb?: number | null;
  tableComment?: string | null;
};

type Payload = {
  kind?: 'mysql-table-list';
  database?: string | null;
  count?: number;
  items?: TableItem[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'mysql-tables-view', version: '1.0.0' }, {}, { autoResize: true });
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

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString();
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
        <p class="eyebrow">MySQL</p>
        <h1>${escapeHtml(payload.database ?? 'Tables')}</h1>
        <p class="subtitle">Browse table metadata before drilling into schema details.</p>
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
                  <th>Engine</th>
                  <th>Rows</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item) => `
                    <tr>
                      <td>
                        <div class="name-cell">
                          <strong>${escapeHtml(item.tableName ?? 'Untitled')}</strong>
                          ${item.tableComment ? `<span>${escapeHtml(item.tableComment)}</span>` : ''}
                        </div>
                      </td>
                      <td>${escapeHtml(item.engine ?? '—')}</td>
                      <td>${formatNumber(item.tableRows)}</td>
                      <td>${item.sizeMb == null ? '—' : `${item.sizeMb} MB`}</td>
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
