import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme } from './postgres-shared.js';

type Payload = {
  kind?: 'postgres-query-result';
  query?: string | null;
  rowCount?: number;
  limited?: boolean;
  maxRows?: number | null;
  timeout?: number | null;
  columns?: string[];
  rows?: Array<Record<string, unknown>>;
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'postgres-query-view', version: '1.0.0' }, {}, { autoResize: true });
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

function formatCell(value: unknown): string {
  if (value == null) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function render() {
  const t = getTheme(isDarkTheme);
  const columns = payload.columns ?? [];
  const rows = payload.rows ?? [];

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .query-box {
        padding: 10px 12px;
        border: 1px solid var(--row-border);
        border-radius: 14px;
        background: var(--panel-bg);
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .content { min-width: 0; }
      .table-wrap { overflow-x: auto; }
      th { white-space: nowrap; }
      td { max-width: 240px; white-space: normal; overflow-wrap: break-word; }
    </style>
    <div class="shell">
      <section class="panel hero">
        <p class="eyebrow">Postgres</p>
        <h1>Query Result</h1>
        <p class="subtitle">Structured result grid for read-only queries.</p>
        <div class="chips">
          <span class="chip">Rows: ${payload.rowCount ?? rows.length}</span>
          ${payload.limited ? `<span class="chip">Limited to ${payload.maxRows ?? rows.length}</span>` : ''}
          ${payload.timeout ? `<span class="chip">Timeout ${payload.timeout}ms</span>` : ''}
        </div>
      </section>
      <section class="panel content">
        <div class="toolbar"><p class="section-title">Query</p></div>
        <div class="query-box">${escapeHtml(payload.query ?? '')}</div>
      </section>
      <section class="panel content">
        <div class="toolbar">
          <p class="section-title">Rows</p>
          <span class="toolbar-right">${rows.length} returned</span>
        </div>
        ${rows.length === 0
          ? '<div class="empty">Query executed successfully. No rows returned.</div>'
          : `<div class="table-wrap"><table>
              <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
              <tbody>
                ${rows
                  .map(
                    (row) => `
                    <tr>${columns
                      .map((column) => `<td>${escapeHtml(formatCell(row[column]))}</td>`)
                      .join('')}</tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table></div>`}
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
