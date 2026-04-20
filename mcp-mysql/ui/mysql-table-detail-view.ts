import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme } from './mysql-shared.js';

type Column = {
  columnName?: string | null;
  columnType?: string | null;
  isNullable?: string | null;
  defaultValue?: string | null;
  extra?: string | null;
  columnComment?: string | null;
};

type Index = {
  indexName?: string | null;
  columns?: string | null;
  isUnique?: number | null;
  indexType?: string | null;
};

type ForeignKey = {
  constraintName?: string | null;
  columnName?: string | null;
  referencedTable?: string | null;
  referencedColumn?: string | null;
  onUpdate?: string | null;
  onDelete?: string | null;
};

type Payload = {
  kind?: 'mysql-table-detail';
  database?: string | null;
  table?: string | null;
  columnCount?: number;
  indexCount?: number;
  foreignKeyCount?: number;
  columns?: Column[];
  indexes?: Index[];
  foreignKeys?: ForeignKey[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'mysql-table-detail-view', version: '1.0.0' }, {}, { autoResize: true });
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
  const columns = payload.columns ?? [];
  const indexes = payload.indexes ?? [];
  const foreignKeys = payload.foreignKeys ?? [];

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .stack { display: grid; gap: 10px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; }
      .subpanel { display: grid; gap: 8px; }
    </style>
    <div class="shell">
      <section class="panel hero">
        <p class="eyebrow">MySQL</p>
        <h1>${escapeHtml(payload.table ?? 'Table')}</h1>
        <p class="subtitle">${escapeHtml(payload.database ?? '')}</p>
        <div class="chips">
          <span class="chip">Columns: ${payload.columnCount ?? columns.length}</span>
          <span class="chip">Indexes: ${payload.indexCount ?? indexes.length}</span>
          <span class="chip">Foreign keys: ${payload.foreignKeyCount ?? foreignKeys.length}</span>
        </div>
      </section>
      <div class="stack">
        <section class="panel content subpanel">
          <div class="toolbar"><p class="section-title">Columns</p></div>
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Null</th><th>Default</th></tr></thead>
            <tbody>
              ${columns
                .map(
                  (column) => `
                  <tr>
                    <td>
                      <strong>${escapeHtml(column.columnName ?? '')}</strong>
                      ${column.columnComment ? `<div class="muted">${escapeHtml(column.columnComment)}</div>` : ''}
                    </td>
                    <td class="mono">${escapeHtml(column.columnType ?? '—')}</td>
                    <td>${escapeHtml(column.isNullable ?? '—')}</td>
                    <td>
                      ${column.defaultValue ?? column.extra
                        ? `<span class="mono">${escapeHtml(column.defaultValue ?? column.extra ?? '—')}</span>`
                        : '—'}
                    </td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
        </section>
        <section class="panel content subpanel">
          <div class="toolbar"><p class="section-title">Indexes</p></div>
          ${indexes.length === 0
            ? '<div class="empty">No indexes found.</div>'
            : `<table>
                <thead><tr><th>Name</th><th>Columns</th><th>Type</th></tr></thead>
                <tbody>
                  ${indexes
                    .map(
                      (index) => `
                      <tr>
                        <td>${escapeHtml(index.indexName ?? '')}</td>
                        <td class="mono">${escapeHtml(index.columns ?? '')}</td>
                        <td>${index.indexName === 'PRIMARY' ? 'Primary' : index.isUnique === 1 ? 'Unique' : escapeHtml(index.indexType ?? 'Index')}</td>
                      </tr>
                    `
                    )
                    .join('')}
                </tbody>
              </table>`}
        </section>
        <section class="panel content subpanel">
          <div class="toolbar"><p class="section-title">Foreign Keys</p></div>
          ${foreignKeys.length === 0
            ? '<div class="empty">No foreign keys found.</div>'
            : `<table>
                <thead><tr><th>Constraint</th><th>Relationship</th><th>Rules</th></tr></thead>
                <tbody>
                  ${foreignKeys
                    .map(
                      (key) => `
                      <tr>
                        <td>${escapeHtml(key.constraintName ?? '')}</td>
                        <td class="mono">${escapeHtml(`${key.columnName ?? ''} → ${key.referencedTable ?? ''}.${key.referencedColumn ?? ''}`)}</td>
                        <td>${escapeHtml(`UPDATE ${key.onUpdate ?? '—'} / DELETE ${key.onDelete ?? '—'}`)}</td>
                      </tr>
                    `
                    )
                    .join('')}
                </tbody>
              </table>`}
        </section>
      </div>
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
