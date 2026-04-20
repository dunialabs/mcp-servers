import {
  App,
  PostMessageTransport,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { baseShellStyles, detectDarkTheme, escapeHtml, getTheme } from './postgres-shared.js';

type Column = {
  columnName?: string | null;
  dataType?: string | null;
  isNullable?: boolean;
  defaultValue?: string | null;
  characterMaximumLength?: number | null;
};

type Index = {
  indexName?: string | null;
  indexDef?: string | null;
  isUnique?: boolean;
  isPrimaryKey?: boolean;
};

type Constraint = {
  constraintName?: string | null;
  constraintType?: string | null;
};

type Payload = {
  kind?: 'postgres-table-detail';
  schema?: string | null;
  table?: string | null;
  columnCount?: number;
  indexCount?: number;
  constraintCount?: number;
  columns?: Column[];
  indexes?: Index[];
  constraints?: Constraint[];
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing root element');

const app = new App({ name: 'postgres-table-detail-view', version: '1.0.0' }, {}, { autoResize: true });
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
  const constraints = payload.constraints ?? [];

  root.innerHTML = `
    <style>
      ${baseShellStyles(t)}
      .stack { display: grid; gap: 10px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; }
      .subpanel { display: grid; gap: 8px; }
    </style>
    <div class="shell">
      <section class="panel hero">
        <p class="eyebrow">Postgres</p>
        <h1>${escapeHtml(payload.table ?? 'Table')}</h1>
        <p class="subtitle">${escapeHtml(payload.schema ?? 'public')}</p>
        <div class="chips">
          <span class="chip">Columns: ${payload.columnCount ?? columns.length}</span>
          <span class="chip">Indexes: ${payload.indexCount ?? indexes.length}</span>
          <span class="chip">Constraints: ${payload.constraintCount ?? constraints.length}</span>
        </div>
      </section>
      <div class="stack">
        <section class="panel content subpanel">
          <div class="toolbar"><p class="section-title">Columns</p></div>
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Null</th><th>Default</th></tr></thead>
            <tbody>
              ${columns.map((column) => `
                <tr>
                  <td><strong>${escapeHtml(column.columnName ?? '')}</strong></td>
                  <td class="mono">${escapeHtml(column.dataType ?? '—')}${column.characterMaximumLength ? ` (${column.characterMaximumLength})` : ''}</td>
                  <td>${column.isNullable ? 'YES' : 'NO'}</td>
                  <td>${column.defaultValue ? `<span class="mono">${escapeHtml(column.defaultValue)}</span>` : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
        <section class="panel content subpanel">
          <div class="toolbar"><p class="section-title">Indexes</p></div>
          ${indexes.length === 0
            ? '<div class="empty">No indexes found.</div>'
            : `<table>
                <thead><tr><th>Name</th><th>Definition</th><th>Type</th></tr></thead>
                <tbody>
                  ${indexes.map((index) => `
                    <tr>
                      <td>${escapeHtml(index.indexName ?? '')}</td>
                      <td class="mono">${escapeHtml(index.indexDef ?? '')}</td>
                      <td>${index.isPrimaryKey ? 'Primary' : index.isUnique ? 'Unique' : 'Index'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>`}
        </section>
        <section class="panel content subpanel">
          <div class="toolbar"><p class="section-title">Constraints</p></div>
          ${constraints.length === 0
            ? '<div class="empty">No constraints found.</div>'
            : `<table>
                <thead><tr><th>Name</th><th>Type</th></tr></thead>
                <tbody>
                  ${constraints.map((constraint) => `
                    <tr>
                      <td>${escapeHtml(constraint.constraintName ?? '')}</td>
                      <td>${escapeHtml(constraint.constraintType ?? '')}</td>
                    </tr>
                  `).join('')}
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
